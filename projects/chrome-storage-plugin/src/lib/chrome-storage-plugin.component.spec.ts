import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChromeStoragePluginComponent } from './chrome-storage-plugin.component';

describe('ChromeStoragePluginComponent', () => {
  let component: ChromeStoragePluginComponent;
  let fixture: ComponentFixture<ChromeStoragePluginComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChromeStoragePluginComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChromeStoragePluginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
