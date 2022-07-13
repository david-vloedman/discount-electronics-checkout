/* eslint-disable react/jsx-no-bind */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable import/no-internal-modules */
/* eslint-disable @typescript-eslint/tslint/config */

import React, { useCallback, useEffect, useState, useRef, useReducer, FC } from 'react';
// @ts-ignore
import $ from 'jquery';
import classNames from 'classnames';

import { IconLock } from '../../ui/icon';
import { LoadingOverlay } from '../../ui/loading';
import { CheckoutContextProps, withCheckout } from '../../checkout';
import { MapToPropsFactory } from '../../common/hoc';
import withPayment from '../../payment/withPayment';

const FB_URL = 'https://us-central1-de-pay-after-app.cloudfunctions.net'
const LOCAL_URL = 'http://localhost:5001/de-pay-after-app/us-central1'

type Action = {
    type: string,
    payload: any
}

enum CCSelectors {
    cardholderName = '#name-multiple',
    number = '#cc-multiple',
    cvv = '#cvv-multiple',
    expirationDate = '#expiration-multiple'
}


const initialInputState = {
    hasError: false,
    message: ''
}

const initialFormInputs = {
    cardholderName: initialInputState,
    number: initialInputState,
    cvv: initialInputState,
    expirationDate: initialInputState,
}

const MultiplePaymentForm = (props: any) => {
    console.log(props)
    const { 
        billingAddress, 
        customer,
        disableSubmit,
        method,
        navToLoginStep,
        // setSubmit 
    } = props

    const [braintreeLoaded, setBraintreeLoaded] = useState(() => false);

    const [{
        cardholderName,
        number,
        cvv,
        expirationDate
    } , dispatchFormAction] = useReducer(errorReducer, initialFormInputs)

    const btClientRef = useRef(null)
    const hostedFieldRef = useRef(null)
    
    useEffect(() => {
        disableSubmit(method, customer.isGuest)    
    }, [])

    const setupForm = useCallback((err: any, hostedFieldsInstance: any) => {
        if (err) {
            // handle error
            console.log(err)
            return
        }
        hostedFieldRef.current = hostedFieldsInstance
        hostedFieldsInstance.on('focus', (e: any) => 
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        )
        $('.checkout-form').on('submit', handleFormSubmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleBraintree = useCallback((braintree: any) => (err: any, clientInstance: any)  => {
        if (err) { 
            console.log(err)
            //handleBraintreeError(err) 
            return
        }
        btClientRef.current = clientInstance

        braintree.hostedFields.create({
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

    
    // useEffect(() => {
    //     return () => {
    //         const { current: client } = btClientRef
    //         const { current: hostedFields } = hostedFieldRef
    //         // @ts-ignore
    //         client?.teardown()
    //         // @ts-ignore
    //         hostedFields?.teardown()
    //     }
    // }, [])

    useEffect(() => {
        // @ts-ignore
        const { braintree = null } = window;
        if (braintree) {
            braintree.client.create(
                {
                    authorization: 'sandbox_rzm2kvvr_nmcdvfz276mxy4fv',
                },
                handleBraintree(braintree)
            );
        }
    }, [handleBraintree]);

    const handleFormSubmit = (e: any) => {
        e.preventDefault();
        
        const { current: hostedFields } = hostedFieldRef

        // @ts-ignore
        hostedFields?.tokenize((err, payload) => {
            if(err) {
                return handleTokenError(err, dispatchFormAction)
            }

            return handleTokenSuccess(payload, billingAddress)
        })
    }

    const handleSignInClick = (e: any) => {
        console.log(e)
        e.preventDefault();
        navToLoginStep()
    }

    return (
        <div className="paymentMethod paymentMethod--creditCard">
            { 
                customer.isGuest && 
                    <div>
                        You must 
                        <a href='#' onClick={ handleSignInClick }> sign-in </a>
                        to use 3 Easy Payments.
                    </div> 
            }

            { 
                customer.isGuest || 
                <LoadingOverlay hideContentWhenLoading={ true } isLoading={ !braintreeLoaded }>
                    <div className="form-ccFields">
                        <div className={ classNames("form-field form-field--ccNumber", { ['form-field--error']: number.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardNumber">Credit Card Number</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="cc-multiple" />
                            <IconLock />
                            <FormFieldError hasError={ number.hasError } message={ number.message } name={ 'hostedForm.errors.cardNumber' } />
                        </div>
                        <div className={ classNames("form-field form-field--ccExpiry", { ['form-field--error']: expirationDate.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardExpiry">Expiration</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="expiration-multiple" />
                            <FormFieldError hasError={ expirationDate.hasError } message={ expirationDate.message } name={ 'hostedForm.errors.cardExpiry' } />
                        </div>
                        <div className={ classNames("form-field form-field--ccName", { ['form-field--error']: cardholderName.hasError }) }>
                            <label className="form-label optimizedCheckout-form-label" htmlFor="hostedForm.errors.cardName">Name on Card</label>
                            <div className="form-input optimizedCheckout-form-input has-icon" id="name-multiple" />
                            <FormFieldError hasError={ cardholderName.hasError } message={ cardholderName.message } name={ 'hostedForm.errors.cardName' } />
                        </div>
                        <div className={ classNames("form-field form-ccFields-field--ccCvv", { ['form-field--error']: cvv.hasError }) }>
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
            
        </div>
    );
};

interface FormFieldErrorProps {
    message: string,
    name: string,
    hasError: boolean
}
const FormFieldError:FC<FormFieldErrorProps> = ({message, name, hasError = false}) => {

    if(!hasError) return null

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
)}

const getBraintreeCustomerId = async (billingAddress: any, nonce: string) => {
    try {
        const { firstName, lastName, email, address1, address2, countryCode, stateOrProvidenceCode, postalCode, phone, city } = billingAddress

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
            nonce
        }

        const response = await fetch(`${LOCAL_URL}/customer/get-or-create-customer`, {method: 'POST', body: JSON.stringify(requestData) } ).then(res => res.json())
        
        console.log(response, 'data from request')
    } catch (error) {
        console.error(error)
    }
}

const handleTokenSuccess = (payload: any, billingAddress: any) => {
    const { nonce } = payload
    getBraintreeCustomerId(billingAddress, nonce)
}

enum ActionTypes {
    inputError = 'INPUT_ERROR',
    formEmpty = 'FORM_EMPTY',
    inputFocus = 'INPUT_FOCUS'
}

enum InputRequiredMessages {
    cardholderName = 'Name on Card is required',
    number = 'Credit Card Number is required',
    expirationDate = 'Expiration Date is required',
    cvv = 'CVV is required'
}

enum InputInvalidMessages {
    cardholderName = 'Name on Card must be valid',
    number = 'Credit Card Number must be valid',
    expirationDate = 'Expiration Date must be a valid future date in MM/YY format',
    cvv = 'CVV is required'
}



const resetInputErrorState = (state: any, inputKey: any) => ({
        ...state,
        [inputKey]: initialInputState
    })

const handleEmptyForm = (state: any, _payload: any) => {
    const forwardedPayload = {
        details: {
            invalidFieldKeys: Object.keys(initialFormInputs)
        }
    }
    return handleInputError(state, forwardedPayload)
}

const handleInputError = (state: any, payload: any) => {
    const { details: {invalidFieldKeys} } = payload
    const copy = state
    
    invalidFieldKeys.map((key:string) => {
        console.log(CCSelectors[key])
        // @ts-ignore
        const value = $(CCSelectors[key])
        console.log(value, 'value')
        // @ts-ignore
        copy[key] = { ...copy[key], hasError: true, message: InputRequiredMessages[key] }
    }) 
    return { ...copy}
}

const errorReducer = (state: any, action: Action) => {
    switch (action.type) {
        case ActionTypes.inputError:
            return handleInputError(state, action.payload)
        case ActionTypes.formEmpty:
            return handleEmptyForm(state, action.payload)
        case ActionTypes.inputFocus:
            return resetInputErrorState(state, action.payload)
        default:
            return state
    }
}

const handleTokenError = (error: any, dispatch: any) => {
    
    switch (error.code) {
        case 'HOSTED_FIELDS_FIELDS_EMPTY':
            return dispatch({type: ActionTypes.formEmpty, payload: error})

        case 'HOSTED_FIELDS_FIELDS_INVALID':
            return dispatch({type: ActionTypes.inputError, payload: error})

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
}

const mapFromCheckoutProps: MapToPropsFactory<CheckoutContextProps, any, any> = () => {
    return (context, props) => {

        const {
            method,
        } = props;

        const { checkoutState } = context;
                
        const {
            data: {
                getCheckout,
                getConfig,
                getCustomer,
                getBillingAddress
            }
            
        } = checkoutState

        const checkout = getCheckout();
        const config = getConfig();
        const customer = getCustomer();
        const billingAddress = getBillingAddress()

        if (!checkout || !config || !customer || !method) {
            return null;
        }

        return {
            customer,
            billingAddress,
            method
        };
    };
};

export default withPayment(withCheckout(mapFromCheckoutProps)(MultiplePaymentForm))
