/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable import/no-internal-modules */
import classNames from 'classnames';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { withCheckout, CheckoutContextProps } from '../../checkout';
import { MapToPropsFactory } from '../../common/hoc';
import withPayment from '../../payment/withPayment';
import { IconLock } from '../../ui/icon';
import { LoadingOverlay } from '../../ui/loading';

import { errorReducer, handleTokenError, initialFormErrorStates, ActionTypes } from './errorReducer';
import { createCustomer, getCustomer } from './utils/customer-helpers';
import FormFieldError from './FormFieldError';
import MultiplePaymentErrorModal from './MultiplePaymentErrorModal';

enum CCSelectors {
    cardholderName = '#name-multiple',
    number = '#cc-multiple',
    cvv = '#cvv-multiple',
    expirationDate = '#expiration-multiple',
}

const initialErrorModalState = {
    hasError: false,
    message: '',
    title: '',
};

const initialExistingCustomer = {
    isLoaded: false,
    customer: null,
}

const initialLoadingState = {
    btLoading: false,
    ez3Loading: false,
}

const MultiplePaymentForm = (props: any) => {
    const {
        billingAddress,
        customer,
        disableSubmit,
        method,
        navToLoginStep,
        setSubmit,
    } = props;

    const [{
        cardholderName,
        number,
        cvv,
        expirationDate,
    } , dispatchFormAction] = useReducer(errorReducer, initialFormErrorStates);

    const [isLoading, setIsLoading] = useState(() => initialLoadingState);
    const [errorModalState, updateErrorModalState] = useState(() => initialErrorModalState);
    const [existingCustomer, updateExistingCustomer] = useState(() => initialExistingCustomer)

    const btClientRef = useRef(null);
    const hostedFieldRef = useRef(null);

    const setupForm = useCallback((err: any, hostedFieldsInstance: any) => {
        if (err) {
            return console.log('MultiplePaymentForm -> setupForm error:', err);
        }

        hostedFieldRef.current = hostedFieldsInstance;

        hostedFieldsInstance.on('focus', (e: any) =>
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );

        setIsLoading(state => ({
            ...state,
            btLoading: false
        }))
    }, []);

    const handleBraintree = useCallback((braintree: any) => (err: any, clientInstance: any)  => {
        if (err) {
            return console.log('MultiplePaymentForm -> handleBraintree error:', err);
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

        
    }, [setupForm]);

    const handleFormSubmit = () => {
        const { current: hostedFields } = hostedFieldRef;
        // @ts-ignore
        hostedFields?.tokenize((err: any, payload: any) =>
                err
                    ? handleTokenError(err, dispatchFormAction)
                    : handleTokenSuccess(payload, billingAddress, handleModalError)
            );
    };

    const handleSignInClick = (e: any) => {
        e.preventDefault();
        navToLoginStep();
    };

    const handleErrorModalClose = () => updateErrorModalState(initialErrorModalState);

    const handleModalError = (message: string, title: string) => {
        updateErrorModalState({
            hasError: true,
            message,
            title,
        });
    };

    /**
     *
     *  Side effects
     *
     */
    useEffect(() => console.log(existingCustomer), [existingCustomer])
    /*  Component Mount/Unmount */
    useEffect(() => {
        const tryGetCustomer = async () => {
            const { email } = billingAddress
            const { data = null } = await getCustomer(email)
                
            updateExistingCustomer(() => ({
                isLoaded: true,
                customer: data
            }))
            
            setIsLoading(state => ({
                ...state,
                ez3Loading: false
            }))
        }

        disableSubmit(method, customer.isGuest);

        if( ! customer.isGuest ) {
            setIsLoading(() => ({
                ez3Loading: true,
                btLoading: true
            }));
            console.log('setting loading state')
            setSubmit(method, handleFormSubmit);
            tryGetCustomer();
        }
              
        // todo setup clean up
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
            const { client: { create } } = braintree;
            create(
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
                <LoadingOverlay hideContentWhenLoading={ true } isLoading={ isLoading.btLoading || isLoading.ez3Loading }>
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
                isOpen={ errorModalState.hasError }
                message={ errorModalState.message }
                onClose= { handleErrorModalClose }
                title={ errorModalState.title }
            />
        </div>
    );
};

const handleTokenSuccess = async (
        payload: any,
        billingAddress: any,
        handleModalError: (message: string, title: string) => void
    ) => {
    const { nonce } = payload;
    const { error, success, data } = await createCustomer(billingAddress, nonce);
    success
        ? handleCustomerSuccess(data)
        : handleCustomerError(handleModalError, error);
};

const handleCustomerSuccess = (response: any) => {
    console.log('customer successfully created');
    // this is where the subscription api will be called
};

const handleCustomerError = (
        handleModalError: (message: string, title: string) => void, response: any
    ) => {

    const {
        verificationError,
        existingCustomerError,
    } = response;

    if (verificationError) {
        const message = "We're experiencing difficulty processing your transaction. Please contact us or try again later.";
        const title = "Something's gone wrong";
        handleModalError(message, title);
    }

    if (existingCustomerError) {
        // this should never happen, unless the initial customer check somehow fails
    }
};

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
