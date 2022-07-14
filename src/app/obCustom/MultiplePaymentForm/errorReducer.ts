/* eslint-disable @typescript-eslint/tslint/config */
interface Action {
    type: string;
    payload: any;
}

export enum ActionTypes {
    inputError = 'INPUT_ERROR',
    formEmpty = 'FORM_EMPTY',
    inputFocus = 'INPUT_FOCUS',
}

enum InputRequiredMessages {
    cardholderName = 'Name on Card is required',
    number = 'Credit Card Number is required',
    expirationDate = 'Expiration Date is required',
    cvv = 'CVV is required',
}

// enum InputInvalidMessages {
//     cardholderName = 'Name on Card must be valid',
//     number = 'Credit Card Number must be valid',
//     expirationDate = 'Expiration Date must be a valid future date in MM/YY format',
//     cvv = 'CVV is required'
// }

export const initialInputState = {
    hasError: false,
    message: '',
};

export const initialFormErrorStates = {
    cardholderName: initialInputState,
    number: initialInputState,
    cvv: initialInputState,
    expirationDate: initialInputState,
};

export const errorReducer = (state: any, action: Action) => {
    const { type, payload } = action

    switch (type) {
        case ActionTypes.inputError:
            return handleInputError(state, payload);
        case ActionTypes.formEmpty:
            return handleEmptyForm(state, payload);
        case ActionTypes.inputFocus:
            return resetInputErrorState(state, payload);
        default:
            return state;
    }
};

export const handleTokenError = (error: any, dispatch: any) => {
    switch (error.code) {
        case 'HOSTED_FIELDS_FIELDS_EMPTY':
            return dispatch({type: ActionTypes.formEmpty, payload: error});

        case 'HOSTED_FIELDS_FIELDS_INVALID':
            return dispatch({type: ActionTypes.inputError, payload: error});

        case 'HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE':
            return console.error('This payment method already exists in your vault.');

        case 'HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED':
            return console.error('CVV did not pass verification');

        case 'HOSTED_FIELDS_FAILED_TOKENIZATION':
            return console.error('Tokenization failed server side. Is the card valid?');

        case 'HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR':
            return console.error('Network error occurred when tokenizing.');

        default:
            return console.error('Something bad happened!', error);
      }
};

const resetInputErrorState = (state: any, inputKey: any) => ({
    ...state,
    [inputKey]: initialInputState,
});

const handleEmptyForm = (state: any, _payload: any) => {
    const forwardedPayload = {
        details: {
            invalidFieldKeys: Object.keys(initialFormErrorStates),
        },
    };

    return handleInputError(state, forwardedPayload);
};

const handleInputError = (state: any, payload: any) => {
    const { details: {invalidFieldKeys} } = payload;
    const copy = state;

    invalidFieldKeys.map((key: string) => {
        // @ts-ignore
        // const value = $(CCSelectors[key]);
        // console.log(value, 'value');
        // @ts-ignore
        copy[key] = { ...copy[key], hasError: true, message: InputRequiredMessages[key] };
    });

    return { ...copy};
};
