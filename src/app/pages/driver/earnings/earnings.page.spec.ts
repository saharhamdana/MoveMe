import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EarningsPage } from './earnings.page';

describe('EarningsPage', () => {
  let component: EarningsPage;
  let fixture: ComponentFixture<EarningsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EarningsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
