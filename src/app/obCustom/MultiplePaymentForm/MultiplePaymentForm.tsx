/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable import/no-internal-modules */
// @ts-nocheck
import classNames from 'classnames';
import React, { FC, useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { withCheckout, CheckoutContextProps } from '../../checkout';
import { MapToPropsFactory } from '../../common/hoc';
import withPayment from '../../payment/withPayment';
import { IconLock } from '../../ui/icon';
import { LoadingOverlay } from '../../ui/loading';

import { errorReducer, handleTokenError, initialFormErrorStates, ActionTypes } from './errorReducer';
import { createCustomer, getCustomer } from './utils/customer-helpers';
import FormFieldError from './FormFieldError';
import MultiplePaymentErrorModal from './MultiplePaymentErrorModal';
import SavedCardForm, { SavedCard } from './SavedCardForm';

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


interface ExistingCustomerState {
    isLoaded: boolean
    customer: {
        id: string
        savedCards: SavedCard[]
    } | null
    currentCard: SavedCard | null
}

const initialExistingCustomer:ExistingCustomerState = {
    isLoaded: false,
    customer: null,
    currentCard: null
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

    const toggleBTLoading = () => setIsLoading(state => ({
        ...state,
        btLoading: !state.btLoading
    }))

    const toggleEZ3Loading = () => setIsLoading(state => ({
        ...state,
        ez3Loading: !state.ez3Loading
    }))

    const setupNewPaymentForm = useCallback((err: any, hostedFieldsInstance: any) => {
        if (err) {
            toggleBTLoading()
            return console.log('MultiplePaymentForm -> setupForm error:', err);
        }

        hostedFieldRef.current = hostedFieldsInstance;

        hostedFieldsInstance.on('focus', (e: any) =>
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );

        toggleBTLoading()
    }, []);

    const handleBraintree = useCallback((braintree: any) => (err: any, clientInstance: any)  => {
        if (err) {
            toggleBTLoading()
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
        }, setupNewPaymentForm);

        
    }, [setupNewPaymentForm]);

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

    const handleModalError = (message: string, title: string) => 
        updateErrorModalState({
            hasError: true,
            message,
            title,
        });
    
    const setExistingCustomerCard = (card: SavedCard) => 
        updateExistingCustomer(state => ({
            ...state,
            currentCard: card
        }))
    

    /**
     *
     *  Side effects
     *
     */
    useEffect(() => console.log(existingCustomer), [existingCustomer])
    useEffect(() => console.log(isLoading), [isLoading])
    /*  Component Mount/Unmount */
    useEffect(() => {
        const tryGetCustomer = async () => {
            const { email } = billingAddress
            const { data = null } = await getCustomer(email)
            const { savedCards } = data
            // @ts-ignore
            const defaultCard = savedCards.find(({ isDefault }) => isDefault)

            updateExistingCustomer(state => ({
                ...state,
                isLoaded: true,
                customer: data,
                currentCard: defaultCard
            }))
            
            toggleEZ3Loading()
        }

        disableSubmit(method, customer.isGuest);

        if( ! customer.isGuest ) {
            setIsLoading(() => ({
                ez3Loading: true,
                btLoading: true
            }));
            
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

    // braintree setup entry point
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

    const hasExistingAccount = existingCustomer.isLoaded && Boolean(existingCustomer.customer)

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
                        {
                            hasExistingAccount && <SavedCardForm currentCard={ existingCustomer.currentCard } savedCards={ existingCustomer.customer?.savedCards } setCurrentCard={ setExistingCustomerCard } />
                        }
                        {
                            hasExistingAccount || 
                        <>
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
                        </>
                    }
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
