import { TestBed } from "@angular/core/testing";

import { NgxsModule, State, Store, Action, StateContext } from "@ngxs/store";

import { DEFAULT_STATE_KEY } from "../lib/internals";
import {
  NgxsChromeStoragePluginModule,
  StorageOption,
  StorageEngine,
  NGXS_CHROME_STORAGE_ENGINE
} from "../public-api";

describe("NgxsStoragePlugin", () => {
  class Increment {
    static type = "INCREMENT";
  }

  class Decrement {
    static type = "DECREMENT";
  }

  interface CounterStateModel {
    count: number;
  }

  @State<CounterStateModel>({
    name: "counter",
    defaults: { count: 0 }
  })
  class CounterState {
    @Action(Increment)
    increment({ getState, setState }: StateContext<CounterStateModel>) {
      setState({
        count: getState().count + 1
      });
    }

    @Action(Decrement)
    decrement({ getState, setState }: StateContext<CounterStateModel>) {
      setState({
        count: getState().count - 1
      });
    }
  }

  @State<CounterStateModel>({
    name: "lazyLoaded",
    defaults: { count: 0 }
  })
  class LazyLoadedState {}

  let localStorage;
  let syncStorage;

  class ChromeLocalStorage implements StorageEngine {
    static Storage: any = {
      [DEFAULT_STATE_KEY]: {
        counter: {
          count: 100
        }
      }
    };

    get(key: string, fn: (data) => void) {
      fn && fn(ChromeLocalStorage.Storage[key]);
    }

    set(val: object, fn: () => void) {
      Object.keys(val).forEach(key => {
        ChromeLocalStorage.Storage[key] = val[key];
      });

      fn && fn();
    }

    remove(key: string) {
      delete ChromeLocalStorage.Storage[key];
    }

    clear() {
      ChromeLocalStorage.Storage = {};
    }
  }

  class ChromeSyncStorage implements StorageEngine {
    static Storage: any = {
      [DEFAULT_STATE_KEY]: {
        counter: {
          count: 100
        }
      }
    };

    get(key: string, fn: (data) => void) {
      fn && fn(ChromeSyncStorage.Storage[key]);
    }

    set(val: object, fn: () => void) {
      Object.keys(val).forEach(key => {
        ChromeSyncStorage.Storage[key] = val[key];
      });

      fn && fn();
    }

    remove(key: string) {
      delete ChromeSyncStorage.Storage[key];
    }

    clear() {
      ChromeSyncStorage.Storage = {};
    }
  }

  beforeEach(() => {
    localStorage = new ChromeLocalStorage();
    syncStorage = new ChromeSyncStorage();

    chrome.storage = {
      local: localStorage,
      sync: syncStorage,
      managed: {
        getBytesInUse: null,
        clear: null,
        set: null,
        remove: null,
        get: null
      },
      onChanged: {
        addListener: null,
        hasListeners: null,
        getRules: null,
        hasListener: null,
        removeRules: null,
        addRules: null,
        removeListener: null
      }
    };
  });

  afterEach(() => {
    localStorage.remove(DEFAULT_STATE_KEY);
    syncStorage.remove(DEFAULT_STATE_KEY);
  });

  class CounterInfoStateModel {
    constructor(public count: number) {}
  }

  @State<CounterInfoStateModel>({
    name: "counterInfo",
    defaults: { count: 0 }
  })
  class CounterInfoState {}

  it("should get initial data from localstorage", () => {
    // Arrange
    const s = {};

    s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });

    localStorage.set(s);

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot()
      ]
    });

    const store: Store = TestBed.get(Store);
    const state: CounterStateModel = store.selectSnapshot(CounterState);

    // Assert
    expect(state.count).toBe(100);
  });

  it("should save data to localstorage", () => {
    // Arrange
    const s = {};

    s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });
    localStorage.set(s);

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot()
      ]
    });

    const store: Store = TestBed.get(Store);

    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());

    const state: CounterStateModel = store.selectSnapshot(CounterState);

    // Assert
    expect(state.count).toBe(105);

    localStorage.get(DEFAULT_STATE_KEY, res => {
      expect(res).toBe(JSON.stringify({ counter: { count: 105 } }));
    });
  });

  describe("when blank values are returned from localstorage", () => {
    it("should use default data if null retrieved from localstorage", () => {
      // Arrange
      const s = {};
      s[DEFAULT_STATE_KEY] = null;

      localStorage.set(s);

      @State<CounterStateModel>({
        name: "counter",
        defaults: {
          count: 123
        }
      })
      class TestState {}

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([TestState]),
          NgxsChromeStoragePluginModule.forRoot()
        ]
      });

      const store: Store = TestBed.get(Store);
      const state: CounterStateModel = store.selectSnapshot(TestState);

      // Assert
      expect(state.count).toBe(123);
    });

    it("should use default data if undefined retrieved from localstorage", () => {
      // Arrange
      const s = {};

      s[DEFAULT_STATE_KEY] = undefined;

      localStorage.set(s);

      @State<CounterStateModel>({
        name: "counter",
        defaults: {
          count: 123
        }
      })
      class TestState {}

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([TestState]),
          NgxsChromeStoragePluginModule.forRoot()
        ]
      });

      const store: Store = TestBed.get(Store);
      const state: CounterStateModel = store.selectSnapshot(TestState);

      // Assert
      expect(state.count).toBe(123);
    });

    it(`should use default data if the string 'undefined' retrieved from localstorage`, () => {
      // Arrange
      const s = {};

      s[DEFAULT_STATE_KEY] = "undefined";

      localStorage.set(s);

      @State<CounterStateModel>({
        name: "counter",
        defaults: {
          count: 123
        }
      })
      class TestState {}

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([TestState]),
          NgxsChromeStoragePluginModule.forRoot()
        ]
      });

      const store: Store = TestBed.get(Store);
      const state: CounterStateModel = store.selectSnapshot(TestState);

      // Assert
      expect(state.count).toBe(123);
    });
  });

  it("should migrate global localstorage", () => {
    // Arrange
    const data = JSON.stringify({ counter: { count: 100, version: 1 } });

    const s = {};

    s[DEFAULT_STATE_KEY] = data;

    localStorage.set(s);

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot({
          migrations: [
            {
              version: 1,
              versionKey: "counter.version",
              migrate: (state: any) => {
                state.counter = {
                  counts: state.counter.count,
                  version: 2
                };
                return state;
              }
            }
          ]
        })
      ]
    });

    const store: Store = TestBed.get(Store);
    // Call `selectSnapshot` so the `NgxsStoragePlugin.handle` will be invoked also
    // and will run migations
    store.selectSnapshot(CounterState);

    // Assert

    localStorage.get(DEFAULT_STATE_KEY, res => {
      expect(res).toBe(
        JSON.stringify({ counter: { counts: 100, version: 2 } })
      );
    });
  });

  it("should migrate single localstorage", () => {
    // Arrange
    const data = JSON.stringify({
      count: 100,
      version: 1
    });
    localStorage.set({ counter: data });

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot({
          key: "counter",
          migrations: [
            {
              version: 1,
              key: "counter",
              versionKey: "version",
              migrate: (state: any) => {
                state = {
                  counts: state.count,
                  version: 2
                };
                return state;
              }
            }
          ]
        })
      ]
    });

    const store: Store = TestBed.get(Store);
    // Call `selectSnapshot` so the `NgxsStoragePlugin.handle` will be invoked also
    // and will run migations
    store.selectSnapshot(CounterState);

    // Assert
    localStorage.get("counter", res => {
      expect(res).toBe(
        JSON.stringify({
          counts: 100,
          version: 2
        })
      );
    });
  });

  it("should correct get data from session storage", () => {
    // Arrange
    const s = {};

    s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });

    syncStorage.set(s);

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot({
          storage: StorageOption.SyncStorage
        })
      ]
    });

    const store: Store = TestBed.get(Store);
    const state: CounterStateModel = store.selectSnapshot(CounterState);

    // Assert
    expect(state.count).toBe(100);
  });

  it("should save data to syncStorage", () => {
    const s = {};

    s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });

    syncStorage.set(s);

    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot({
          storage: StorageOption.SyncStorage
        })
      ]
    });

    const store: Store = TestBed.get(Store);

    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());

    const state: CounterStateModel = store.selectSnapshot(CounterState);

    // Assert
    expect(state.count).toBe(105);
    syncStorage.get(DEFAULT_STATE_KEY, res => {
      expect(res).toBe(JSON.stringify({ counter: { count: 105 } }));
    });
  });

  it("should use a custom storage engine", () => {
    // Arrange
    class CustomStorage implements StorageEngine {
      static Storage: any = {
        [DEFAULT_STATE_KEY]: {
          counter: {
            count: 100
          }
        }
      };

      get(key: string, fn: (data) => void) {
        fn(CustomStorage.Storage[key]);
      }

      set(val: object, fn: () => void) {
        Object.keys(val).forEach(key => {
          CustomStorage.Storage[key] = val[key];
        });

        fn();
      }

      remove(key: string) {
        delete CustomStorage.Storage[key];
      }

      clear() {
        CustomStorage.Storage = {};
      }
    }

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot({
          serialize(val) {
            return val;
          },
          deserialize(val) {
            return val;
          }
        })
      ],
      providers: [
        {
          provide: NGXS_CHROME_STORAGE_ENGINE,
          useClass: CustomStorage
        }
      ]
    });

    const store: Store = TestBed.get(Store);

    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());
    store.dispatch(new Increment());

    const state: CounterStateModel = store.selectSnapshot(CounterState);

    // Assert
    expect(state.count).toBe(105);
    expect(CustomStorage.Storage[DEFAULT_STATE_KEY]).toEqual({
      counter: { count: 105 }
    });
  });

  it("should merge unloaded data from feature with local storage", () => {
    // Arrange
    const s = {};

    s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });

    localStorage.set(s);

    // Act
    TestBed.configureTestingModule({
      imports: [
        NgxsModule.forRoot([CounterState]),
        NgxsChromeStoragePluginModule.forRoot(),
        NgxsModule.forFeature([LazyLoadedState])
      ]
    });

    const store: Store = TestBed.get(Store);
    const state: {
      counter: CounterStateModel;
      lazyLoaded: CounterStateModel;
    } = store.snapshot();

    // Assert
    expect(state.lazyLoaded).toBeDefined();
  });

  describe("State classes as key", () => {
    @State({
      name: "names",
      defaults: []
    })
    class NamesState {}

    it("should be possible to provide a state class as a key", () => {
      // Arrange
      localStorage.set({ counter: JSON.stringify({ count: 100 }) });

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([CounterState]),
          NgxsChromeStoragePluginModule.forRoot({
            key: CounterState
          })
        ]
      });

      const store: Store = TestBed.get(Store);
      const state: CounterStateModel = store.selectSnapshot(CounterState);

      // Assert
      expect(state.count).toBe(100);
    });

    it("should be possible to provide array of state classes", () => {
      // Arrange
      localStorage.set({ counter: JSON.stringify({ count: 100 }) });
      localStorage.set({ names: JSON.stringify(["Mark", "Artur", "Max"]) });

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([CounterState, NamesState]),
          NgxsChromeStoragePluginModule.forRoot({
            key: [CounterState, NamesState]
          })
        ]
      });

      const store: Store = TestBed.get(Store);

      // Assert
      expect(store.snapshot()).toEqual({
        counter: {
          count: 100
        },
        names: ["Mark", "Artur", "Max"]
      });
    });

    it("should be possible to use both state classes and strings", () => {
      // Arrange
      localStorage.set({ counter: JSON.stringify({ count: 100 }) });
      localStorage.set({ names: JSON.stringify(["Mark", "Artur", "Max"]) });

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([CounterState, NamesState]),
          NgxsChromeStoragePluginModule.forRoot({
            key: [CounterState, "names"]
          })
        ]
      });

      const store: Store = TestBed.get(Store);

      // Assert
      expect(store.snapshot()).toEqual({
        counter: {
          count: 100
        },
        names: ["Mark", "Artur", "Max"]
      });
    });
  });

  describe("Custom serialization", () => {
    it("should alter object before serialization.", () => {
      // Arrange
      const s = {};

      s[DEFAULT_STATE_KEY] = JSON.stringify({ counter: { count: 100 } });

      localStorage.set(s);

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([CounterState]),
          NgxsChromeStoragePluginModule.forRoot({
            beforeSerialize: obj => {
              return {
                counter: {
                  count: obj.counter.count * 2
                }
              };
            }
          })
        ]
      });

      const store: Store = TestBed.get(Store);

      store.dispatch(new Increment());

      const state: CounterStateModel = store.selectSnapshot(CounterState);

      // Assert
      expect(state.count).toBe(101);
      localStorage.get(DEFAULT_STATE_KEY, res => {
        expect(res).toBe(JSON.stringify({ counter: { count: 202 } }));
      });
    });

    it("should alter state and return concrete type after deserialization.", () => {
      // Arrange
      localStorage.set({ counterInfo: JSON.stringify({ count: 100 }) });

      // Act
      TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([CounterInfoState]),
          NgxsChromeStoragePluginModule.forRoot({
            key: "counterInfo",
            afterDeserialize: (obj, key) => {
              if (key === "counterInfo") {
                return new CounterInfoStateModel(obj.count);
              }
            }
          })
        ]
      });

      const store: Store = TestBed.get(Store);
      const state: CounterInfoStateModel = store.selectSnapshot(
        CounterInfoState
      );

      // Assert
      expect(state).toBeInstanceOf(CounterInfoStateModel);
      expect(state.count).toBe(100);
    });
  });
});
