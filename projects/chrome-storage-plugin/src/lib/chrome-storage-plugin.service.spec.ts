import { TestBed } from '@angular/core/testing';

import { ChromeStoragePluginService } from './chrome-storage-plugin.service';

describe('ChromeStoragePluginService', () => {
  let service: ChromeStoragePluginService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChromeStoragePluginService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
