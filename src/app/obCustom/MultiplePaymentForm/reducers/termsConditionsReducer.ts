import { Action } from './errorReducer';

export enum TermsConditionsActions {
    showError = 'SHOW_ERROR',
    hideError = 'HIDE_ERROR',
    toggleTermsConditionsChecked = 'TOGGLE_CHECKED',
}

export const termsConditionsReducer = (state: any, action: Action) => {
    const { type } = action;

    switch (type) {
        case TermsConditionsActions.hideError:
            return {
                ...state,
                showError: false,
            };
        case TermsConditionsActions.showError:
            return {
                ...state,
                showError: true,
            };
        case TermsConditionsActions.toggleTermsConditionsChecked:
            const { isChecked } = state;

            return {
                ...state,
                isChecked: !isChecked,
            };
        default:
            return state;

    }
};

export default termsConditionsReducer;
