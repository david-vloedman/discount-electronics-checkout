/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable import/no-internal-modules */

import classNames from 'classnames';
// @ts-ignore
import $ from 'jquery';
import React, { useCallback, useEffect, useReducer, useRef, useState, FC } from 'react';

import { withCheckout, CheckoutContextProps } from '../../checkout';
import { CustomError } from '../../common/error';
import { MapToPropsFactory } from '../../common/hoc';
import withPayment from '../../payment/withPayment';
import { IconLock } from '../../ui/icon';
import { LoadingOverlay } from '../../ui/loading';

import MultiplePaymentErrorModal from './MultiplePaymentErrorModal';

// const FB_URL = 'https://us-central1-de-pay-after-app.cloudfunctions.net'
const LOCAL_URL = 'http://localhost:5001/de-pay-after-app/us-central1';

enum CCSelectors {
    cardholderName = '#name-multiple',
    number = '#cc-multiple',
    cvv = '#cvv-multiple',
    expirationDate = '#expiration-multiple',
}

const initialInputState = {
    hasError: false,
    message: '',
};

const initialFormErrorStates = {
    cardholderName: initialInputState,
    number: initialInputState,
    cvv: initialInputState,
    expirationDate: initialInputState,
};

const initialErrorModalState = {
    hasError: false,
    message: '',
    title: '',
}

const MultiplePaymentForm = (props: any) => {
    console.log(props);
    const {
        billingAddress,
        customer,
        disableSubmit,
        method,
        navToLoginStep,
        handleSubmitError,
        // setSubmit
    } = props;

    const [{
        cardholderName,
        number,
        cvv,
        expirationDate,
    } , dispatchFormAction] = useReducer(errorReducer, initialFormErrorStates);
    const [braintreeLoaded, setBraintreeLoaded] = useState(() => false);
    const [errorModalState, updateErrorModalState] = useState(() => initialErrorModalState)

    const btClientRef = useRef(null);
    const hostedFieldRef = useRef(null);

    const setupForm = useCallback((err: any, hostedFieldsInstance: any) => {
        if (err) {
            // handle error
            console.log(err);

            return;
        }
        hostedFieldRef.current = hostedFieldsInstance;

        hostedFieldsInstance.on('focus', (e: any) =>
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );
        $('.checkout-form').on('submit', handleFormSubmit);
    }, []);

    const handleBraintree = useCallback((braintree: any) => (err: any, clientInstance: any)  => {
        if (err) {
            console.log(err);

            // handleBraintreeError(err)
            return;
        }

        const { hostedFields: { create } } = braintree;
        btClientRef.current = clientInstance;

        create({
            client: clientInstance,
            fields: {
              cardholderName: {
                selector: CCSelectors.cardholderName,
              },
              number: {
                selector: CCSelectors.number,

              },
              cvv: {
                selector: CCSelectors.cvv,

              },
              expirationDate: {
                selector: CCSelectors.expirationDate,
                placeholder: 'MM / YY',
              },
            },
        }, setupForm);
        setBraintreeLoaded(true);
    }, [setupForm]);

    const handleFormSubmit = (e: any) => {
        e.preventDefault();
        // @ts-ignore
        const { current: { tokenize } } = hostedFieldRef;

        tokenize((err: any, payload: any) => {
            return err
                ? handleTokenError(err, dispatchFormAction)
                : handleTokenSuccess(payload, billingAddress);
            });
    };

    const handleSignInClick = (e: any) => {
        e.preventDefault();
        navToLoginStep();
    };

    const handleErrorModalClose = () => updateErrorModalState(initialErrorModalState)

    const handleModalError= (message: string, title: string) => {
        updateErrorModalState({
            hasError: true,
            message,
            title
        })
    }

    /**
     *
     *  Side effects
     *
     */
    /* Component Mount/Unmount */
    useEffect(() => {
        
        handleModalError('test', 'card verification failure')

        disableSubmit(method, customer.isGuest);

        return () => {
            // const { current: client } = btClientRef
            // const { current: hostedFields } = hostedFieldRef
            // // @ts-ignore
            // client?.teardown()
            // // @ts-ignore
            // hostedFields?.teardown()
        };
    }, []);

    useEffect(() => {
        if (customer.isGuest) { return; }
        // @ts-ignore
        const { braintree = null } = window;

        if (braintree) {
            const { client } = braintree;
            client.create(
                {
                    authorization: 'sandbox_rzm2kvvr_nmcdvfz276mxy4fv',
                },
                handleBraintree(braintree)
            );
        }
    }, [handleBraintree]);

    return (
        <div className="paymentMethod paymentMethod--creditCard">
            {
                customer.isGuest &&
                    <div>
                        You must
                        <a href="#" onClick={ handleSignInClick }> sign-in </a>
                        to use 3 Easy Payments.
                    </div>
            }

            {
                customer.isGuest ||
                <LoadingOverlay hideContentWhenLoading={ true } isLoading={ !braintreeLoaded }>
                    <div className="form-ccFields">
                        <div className={ classNames('form-field form-field--ccNumber', { ['form-field--error']: number.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardNumber">Credit Card Number</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="cc-multiple" />
                            <IconLock />
                            <FormFieldError hasError={ number.hasError } message={ number.message } name={ 'hostedForm.errors.cardNumber' } />
                        </div>
                        <div className={ classNames('form-field form-field--ccExpiry', { ['form-field--error']: expirationDate.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardExpiry">Expiration</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="expiration-multiple" />
                            <FormFieldError hasError={ expirationDate.hasError } message={ expirationDate.message } name={ 'hostedForm.errors.cardExpiry' } />
                        </div>
                        <div className={ classNames('form-field form-field--ccName', { ['form-field--error']: cardholderName.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardName">Name on Card</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="name-multiple" />
                            <FormFieldError hasError={ cardholderName.hasError } message={ cardholderName.message } name={ 'hostedForm.errors.cardName' } />
                        </div>
                        <div className={ classNames('form-field form-ccFields-field--ccCvv', { ['form-field--error']: cvv.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardCode">CVV</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="cvv-multiple" />
                            <IconLock />
                            <FormFieldError hasError={ cvv.hasError } message={ cvv.message } name={ 'hostedForm.errors.cardCode' } />
                        </div>
                    </div>
                    { /* todo: terms and conditions */ }
                    <div>
                        <div>Your payment information must be saved to make multiple payments.</div>
                    </div>
                </LoadingOverlay>
            }
            <MultiplePaymentErrorModal 
                isOpen={ errorModalState?.hasError } 
                message={ errorModalState.message } 
                onClose= { handleErrorModalClose } 
                title={ errorModalState.title }
            />
        </div>
    );
};

interface FormFieldErrorProps {
    message: string;
    name: string;
    hasError: boolean;
}
const FormFieldError: FC<FormFieldErrorProps> = ({message, name, hasError = false}) => {

    if (!hasError) { return null; }

    return (
        <ul className="form-field-errors">
            <li className="form-field-error">
                <label
                    aria-live="polite"
                    className="form-inlineMessage"
                    htmlFor={ name }
                    role="alert"
                >
                    { message }
                </label>
            </li>
        </ul>
); };

const createCustomer = async (billingAddress: any, nonce: string) => {
    try {
        const { firstName, lastName, email, address1, address2, countryCode, stateOrProvidenceCode, postalCode, phone, city } = billingAddress;

        const requestData = {
            firstName,
            lastName,
            email,
            phone,
            address1,
            address2,
            city,
            country: countryCode,
            state: stateOrProvidenceCode,
            postalCode,
            nonce,
        };

        const response = await fetch(`${LOCAL_URL}/customer/create-customer`, {method: 'POST', body: JSON.stringify(requestData) } ).then(res => res.json());

        console.log(response, 'data from request');
    } catch (error) {
        console.error(error);
    }
};

const handleTokenSuccess = (payload: any, billingAddress: any) => {
    const { nonce } = payload;
    createCustomer(billingAddress, nonce);
};

interface Action {
    type: string;
    payload: any;
}

enum ActionTypes {
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
const errorReducer = (state: any, action: Action) => {
    switch (action.type) {
        case ActionTypes.inputError:
            return handleInputError(state, action.payload);
        case ActionTypes.formEmpty:
            return handleEmptyForm(state, action.payload);
        case ActionTypes.inputFocus:
            return resetInputErrorState(state, action.payload);
        default:
            return state;
    }
};

const handleTokenError = (error: any, dispatch: any) => {
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
    const value = $(CCSelectors[key]);
    console.log(value, 'value');
    // @ts-ignore
    copy[key] = { ...copy[key], hasError: true, message: InputRequiredMessages[key] };
});

return { ...copy};
};

const getCustomer = async (email: string) => {
    try {
        return await fetch(`${LOCAL_URL}/customer/get-customer?email=${email}`).then(res => res.json());
    } catch (error) {
        console.error(error);
    }
};

const mapFromCheckoutProps: MapToPropsFactory<CheckoutContextProps, any, any> = () => {
    return (context, props) => {

        const {
            method,
        } = props;

        const { checkoutState } = context;
        console.log(context);
        const {
            data: {
                getCheckout,
                getConfig,
                getCustomer,
                getBillingAddress,
            },

        } = checkoutState;

        const checkout = getCheckout();
        const config = getConfig();
        const customer = getCustomer();
        const billingAddress = getBillingAddress();

        if (!checkout || !config || !customer || !method) {
            return null;
        }

        return {
            customer,
            billingAddress,
            method,
        };
    };
};

export default withPayment(withCheckout(mapFromCheckoutProps)(MultiplePaymentForm));
