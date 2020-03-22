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
import { tap, concatMap, reduce, map } from "rxjs/operators";

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

    if (isInitAction) {
      initAction = from(keys).pipe(
        concatMap(key =>
          new Observable(observer => {
            this._engine.get(key!, data => {
              observer.next(data[key]);
              observer.complete();
            });
          }).pipe(map(val => [key, val]))
        ),
        reduce((previousState, [key, val]: [string, any]) => {
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

          return nextState;
        }, state)
      );
    }

    return initAction.pipe(
      concatMap(stateAfterInit => next(stateAfterInit, event)),
      tap(nextState => {
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
