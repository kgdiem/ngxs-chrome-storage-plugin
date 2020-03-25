import { PLATFORM_ID, Inject, Injectable } from "@angular/core";
import { isPlatformServer } from "@angular/common";
import {
  NgxsPlugin,
  setValue,
  getValue,
  InitState,
  UpdateState,
  actionMatcher,
  NgxsNextPluginFn
} from "@ngxs/store";
import { tap, concatMap, reduce, map, mergeMap } from "rxjs/operators";

import {
  StorageEngine,
  NgxsChromeStoragePluginOptions,
  NGXS_CHROME_STORAGE_ENGINE,
  NGXS_CHROME_STORAGE_PLUGIN_OPTIONS
} from "./symbols";
import { DEFAULT_STATE_KEY } from "./internals";
import { of, from, Observable } from "rxjs";

@Injectable()
export class NgxsChromeStoragePlugin implements NgxsPlugin {
  constructor(
    @Inject(NGXS_CHROME_STORAGE_PLUGIN_OPTIONS)
    private _options: NgxsChromeStoragePluginOptions,
    @Inject(NGXS_CHROME_STORAGE_ENGINE) private _engine: StorageEngine,
    @Inject(PLATFORM_ID) private _platformId: string
  ) {}

  handle(state: any, event: any, next: NgxsNextPluginFn) {
    if (isPlatformServer(this._platformId) && this._engine === null) {
      return next(state, event);
    }

    // We cast to `string[]` here as we're sure that this option has been
    // transformed by the `storageOptionsFactory` function that provided token
    const keys = this._options.key as string[];
    const matches = actionMatcher(event);
    const isInitAction = matches(InitState) || matches(UpdateState);
    let hasMigration = false;

    let initAction = of(state);

    console.log("Handle called");
    console.log("keys", keys);
    console.log("matches", matches);
    console.log("is init action", isInitAction);

    if (isInitAction) {
      initAction = from(keys).pipe(
        mergeMap(key =>
          new Observable(observer => {
            console.log("in storage key observable");
            this._engine.get(key!, data => {
              console.log("got data from engine", key, data);
              observer.next(data[key]);
              observer.complete();
            });
          }).pipe(
            tap(val => console.log("after getting storage values", [key, val])),
            map(val => [key, val])
          )
        ),
        reduce((previousState, [key, val]: [string, any]) => {
          console.log("in reducer", previousState, key, val);

          const isMaster = key === DEFAULT_STATE_KEY;

          let nextState = previousState;

          if (
            val !== "undefined" &&
            typeof val !== "undefined" &&
            val !== null
          ) {
            try {
              const newVal = this._options.deserialize!(val);
              val = this._options.afterDeserialize!(newVal, key);
            } catch (e) {
              console.error(
                "Error ocurred while deserializing the store value, falling back to empty object."
              );
              val = {};
            }

            if (this._options.migrations) {
              this._options.migrations.forEach(strategy => {
                const versionMatch =
                  strategy.version ===
                  getValue(val, strategy.versionKey || "version");
                const keyMatch =
                  (!strategy.key && isMaster) || strategy.key === key;
                if (versionMatch && keyMatch) {
                  val = strategy.migrate(val);
                  hasMigration = true;
                }
              });
            }

            if (!isMaster) {
              nextState = setValue(previousState, key!, val);
            } else {
              nextState = { ...previousState, ...val };
            }

            console.log(nextState);
          } else {
            if (this._options.migrations) {
              if (isMaster) {
                val = Object.assign({}, state);
              } else {
                val = getValue(state, key);
              }

              this._options.migrations.forEach(strategy => {
                const versionMatch =
                  strategy.version ===
                  getValue(val, strategy.versionKey || "version");
                const keyMatch =
                  (!strategy.key && isMaster) || strategy.key === key;
                if (versionMatch && keyMatch) {
                  val = strategy.migrate(val);
                  hasMigration = true;
                }
              });

              if (!isMaster) {
                nextState = setValue(previousState, key, val);
              } else {
                nextState = { ...previousState, ...val };
              }
            }
          }

          console.log("return val", nextState);

          return nextState;
        }, state)
      );
    }

    return initAction.pipe(
      mergeMap(stateAfterInit => {
        console.log("init action pipe", stateAfterInit);

        return next(stateAfterInit, event);
      }),
      tap(nextState => {
        console.log("tapped nextstate", nextState);
        if (!isInitAction || (isInitAction && hasMigration)) {
          for (const key of keys) {
            let val = nextState;

            if (key !== DEFAULT_STATE_KEY) {
              val = getValue(nextState, key);
            }

            try {
              const s = {};

              if (this._options.beforeSerialize) {
                val = this._options.beforeSerialize(val, key);
              }

              s[key] = this._options.serialize(val);

              this._engine.set(s);
            } catch (e) {
              console.error(
                "Error ocurred while serializing the store value, value not updated."
              );
            }
          }
        }
      })
    );
  }
}
