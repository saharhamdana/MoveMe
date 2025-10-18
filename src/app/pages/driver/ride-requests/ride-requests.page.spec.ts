import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RideRequestsPage } from './ride-requests.page';

describe('RideRequestsPage', () => {
  let component: RideRequestsPage;
  let fixture: ComponentFixture<RideRequestsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RideRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
