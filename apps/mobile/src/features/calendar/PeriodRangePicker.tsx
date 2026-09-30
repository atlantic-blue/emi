import type { ReactNode } from 'react';

import { Screen } from '../../components/Screen';

/**
 * The whole period, corrected in one action. Not built yet: the names below are what the screen
 * answers under, so the tests that hold it to its drawing name the parts they are looking for.
 */

export const editPeriodScreenTestID = 'edit-period';
export const editPeriodHeaderTestID = 'edit-period-header';
export const editPeriodTitleTestID = 'edit-period-title';
export const editPeriodBackTestID = 'edit-period-back';
export const editPeriodCancelTestID = 'edit-period-cancel';
export const editPeriodLeadTestID = 'edit-period-lead';
export const editPeriodChangeTestID = 'edit-period-change';
export const editPeriodSaveTestID = 'edit-period-save';
export const periodRangePickerTestID = 'period-range-picker';

export function EditPeriodScreen(): ReactNode {
  return <Screen testID={editPeriodScreenTestID}>{null}</Screen>;
}
