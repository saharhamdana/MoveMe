import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchRidePage } from './search-ride.page';

describe('SearchRidePage', () => {
  let component: SearchRidePage;
  let fixture: ComponentFixture<SearchRidePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchRidePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
