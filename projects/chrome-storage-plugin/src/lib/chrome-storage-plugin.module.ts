import {
  NgModule,
  ModuleWithProviders,
  PLATFORM_ID,
  InjectionToken
} from "@angular/core";
import { NGXS_PLUGINS } from "@ngxs/store";

import {
  NgxsChromeStoragePluginOptions,
  NGXS_CHROME_STORAGE_ENGINE,
  NGXS_CHROME_STORAGE_PLUGIN_OPTIONS
} from "./symbols";
import { NgxsChromeStoragePlugin } from "./storage.plugin";
import { storageOptionsFactory, engineFactory } from "./internals";

export const USER_OPTIONS = new InjectionToken("USER_OPTIONS");

@NgModule()
export class NgxsChromeStoragePluginModule {
  static forRoot(
    options?: NgxsChromeStoragePluginOptions
  ): ModuleWithProviders<NgxsChromeStoragePluginModule> {
    return {
      ngModule: NgxsChromeStoragePluginModule,
      providers: [
        {
          provide: NGXS_PLUGINS,
          useClass: NgxsChromeStoragePlugin,
          multi: true
        },
        {
          provide: USER_OPTIONS,
          useValue: options
        },
        {
          provide: NGXS_CHROME_STORAGE_PLUGIN_OPTIONS,
          useFactory: storageOptionsFactory,
          deps: [USER_OPTIONS]
        },
        {
          provide: NGXS_CHROME_STORAGE_ENGINE,
          useFactory: engineFactory,
          deps: [NGXS_CHROME_STORAGE_PLUGIN_OPTIONS, PLATFORM_ID]
        }
      ]
    };
  }
}
