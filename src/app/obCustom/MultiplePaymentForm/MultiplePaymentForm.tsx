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

import { errorReducer, handleTokenError, initialFormErrorStates, ActionTypes, Action } from './errorReducer';
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

interface VisibilityState {
    existingCards: boolean;
    newCard: boolean;
}

const initialVisibilityState:VisibilityState = {
    existingCards: false,
    newCard: false
}

interface LoadingState {
    btLoading: boolean;
    ez3Loading: boolean;
}

const initialLoadingState: LoadingState = {
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
        checkout
    } = props;

    const [{
        cardholderName,
        number,
        cvv,
        expirationDate,
    } , dispatchFormAction] = useReducer(errorReducer, initialFormErrorStates);

    const [isLoading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState);
    const [errorModalState, updateErrorModalState] = useState(() => initialErrorModalState);
    const [existingCustomer, updateExistingCustomer] = useState(() => initialExistingCustomer);
    const [visibilityState, dispatchVisibilityAction] = useReducer(visibilityReducer, initialVisibilityState)
    const [termsConditionsChecked, toggleTermsConditionsChecked] = useReducer(state => !state, false)

    const btMainRef = useRef(null)
    const btClientRef = useRef(null);
    const hostedFieldRef = useRef(null);

    const setupNewPaymentForm = useCallback((err: any, hostedFieldsInstance: any) => {
        if (err) {
            return console.log('MultiplePaymentForm -> setupForm error:', err);
        }

        hostedFieldRef.current = hostedFieldsInstance;

        hostedFieldsInstance.on('focus', (e: any) =>
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );

        dispatchLoading({ type: LoadingActions.BrainTreeIdle })
        
    }, []);

    const handleBraintree = useCallback((err: any, clientInstance: any)  => {
        console.log('handling bt')
        if (err) {
            dispatchLoading({ type: LoadingActions.BrainTreeIdle })
            return console.log('MultiplePaymentForm -> handleBraintree error:', err);
        }

        btClientRef.current = clientInstance;

        const { current: braintree } = btMainRef
        
        if (!visibilityState.newCard) { 
            dispatchLoading({ type: LoadingActions.BrainTreeIdle })
            return; 
        }

        if(!braintree) {
            console.error('Braintree not found')
            return

        }

        const { hostedFields: { create } } = braintree;
        // @ts-ignore
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

        
    }, [setupNewPaymentForm, visibilityState]);

    const handleFormSubmit = () => {
        const { isLoaded, currentCard} = existingCustomer;
        
        isLoaded && currentCard 
            ? handleSavedCardSubmit()
            : handleNewCardSubmit()
    };

    const handleNewCardSubmit = () => {
        const { current: hostedFields } = hostedFieldRef;
        // @ts-ignore
        hostedFields?.tokenize((err: any, payload: any) =>
                err
                    ? handleTokenError(err, dispatchFormAction)
                    : handleTokenSuccess(payload, billingAddress, handleModalError, checkout)
            );
    };

    const handleSavedCardSubmit = () => {}

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
    // useEffect(() => console.log(existingCustomer), [existingCustomer])
    // useEffect(() => console.log(isLoading), [isLoading])
    // useEffect(() => console.log(visibilityState), [visibilityState])
    useEffect(() => console.log(termsConditionsChecked), [termsConditionsChecked])
    /*  Component Mount/Unmount */
    useEffect(() => {
        const tryGetCustomer = async () => {
            const { email } = billingAddress
            const { data = null } = await getCustomer(email)
            const { savedCards } = data
            // @ts-ignore
            const defaultCard = savedCards.find(({ isDefault }) => isDefault)

            if ( data ) {
                dispatchVisibilityAction({ type: VisibilityActions.toggleExistingCard })
            } else {
                dispatchVisibilityAction({ type: VisibilityActions.toggleNewCard })
            }

            updateExistingCustomer(state => ({
                ...state,
                isLoaded: true,
                customer: data,
                currentCard: defaultCard
            }))
            
            dispatchLoading({ type: LoadingActions.EZ3Idle })
        }

        
        disableSubmit(method, customer.isGuest);

        if( ! customer.isGuest ) {
            dispatchLoading({ type: LoadingActions.EZ3Loading })          
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
        dispatchLoading( { type: LoadingActions.BrainTreeLoading })
        if (customer.isGuest) { return; }
        // @ts-ignore
        const { braintree = null } = window;

        if (braintree) {

            btMainRef.current = braintree

            const { client: { create } } = braintree;

            create(
                {
                    authorization: 'sandbox_rzm2kvvr_nmcdvfz276mxy4fv',
                },
                handleBraintree
            );
        } else {
            console.error('Braintree not found')
            dispatchLoading({ type: LoadingActions.BrainTreeIdle })
        }
    }, [handleBraintree]);

    useEffect(() => {
        const { newCard: newCardFormVisible } = visibilityState
        if(newCardFormVisible) {
            handleBraintree(null, btClientRef.current)
        }
        
    }, [visibilityState, handleBraintree])

    const test = () => console.log('chaing')

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
                            visibilityState.existingCards && 
                            <SavedCardForm currentCard={ existingCustomer.currentCard } dispatchVisibility={ dispatchVisibilityAction } savedCards={ existingCustomer.customer?.savedCards } setCurrentCard={ setExistingCustomerCard } />
                        }
                        {
                            visibilityState.newCard && 
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
                    <div className='form-field'>
                        
                            
                        <input className='form-checkbox optimizedCheckout-form-checkbox' id="test" name="ez3-terms" onChange={ () => console.log('testing') } type="checkbox" value={ 'checked' } />
                        <label className='form-label optimizedCheckout-form-label'>
                            Yes, I agree with the above terms and conditions
                        </label> 
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

export enum VisibilityActions {
    toggleNewCard = 'TOGGLE_NEW',
    toggleExistingCard = 'TOGGLE_EXISTING',
    reset = 'RESET',
    hideNewCard = 'HIDE_NEW',
    showNewCard = 'SHOW_NEW',
    hideExistingCard = 'HIDE_EXISTING',
    showExistingCard = 'SHOW_EXISTING',
}

const visibilityReducer = (state: VisibilityState, action: Action) => {
    const { type }= action

    switch(type) {
        case VisibilityActions.toggleExistingCard:
            const { existingCards } = state
            return {
                ...state,
                existingCards: !existingCards
            }
        case VisibilityActions.toggleNewCard:
            const { newCard } = state
            return {
                ...state,
                newCard: !newCard
            }
        case VisibilityActions.reset:
            return {
                ...initialVisibilityState
            }
        case VisibilityActions.hideExistingCard: 
            return {
                ...state,
                existingCards: false
            }
        case VisibilityActions.showExistingCard: 
            return {
                ...state,
                existingCards: true
            }
        case VisibilityActions.hideNewCard: 
            return {
                ...state,
                newCard: false
            }
        case VisibilityActions.showNewCard: 
            return {
                ...state,
                newCard: true
            }
        default:
            return state
    }
}

enum LoadingActions {
    BrainTreeLoading = 'BRAIN_TREE_LOADING',
    BrainTreeIdle = 'BRAIN_TREE_IDLE',
    EZ3Loading = 'EZ3_LOADING',
    EZ3Idle= 'EZ3_Idle',
}


const loadingReducer = (state: LoadingState, action: Action) => {
    const { type } = action

    switch(type) {
        case LoadingActions.BrainTreeIdle:
            return {
                ...state,
                btLoading: false,
            }
        case LoadingActions.BrainTreeLoading:
            return {
                ...state,
                btLoading: true,
            }
        case LoadingActions.EZ3Idle:
            return {
                ...state,
                ez3Loading: false,
            }
        case LoadingActions.EZ3Loading:
            return {
                ...state,
                ez3Loading: false,
            }
        default:
            return state;
        
    }
}

const handleTokenSuccess = async (
        payload: any,
        billingAddress: any,
        handleModalError: (message: string, title: string) => void,
        checkout: any
    ) => {
    const { nonce } = payload;
    const { error, success, data } = await createCustomer(billingAddress, nonce, checkout);
    success
        ? handleCustomerSuccess(data, checkout, nonce)
        : handleCustomerError(handleModalError, error);
};

const handleCustomerSuccess = (_response: any, checkout: any, nonce: any) => {
    console.log('customer successfully created');

    const { customerId, cartAmount } = checkout.cart
    const  subPrice = parseFloat(cartAmount) / 3

    const requestData = {
        "orderId": ['maybe use checkout/cart id for the meantime since order id is not created yet'],
        "customerId": customerId,
        "subPrice": subPrice,
        "nonce": nonce
    };
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
            checkout
        };
    };
};

export default withPayment(withCheckout(mapFromCheckoutProps)(MultiplePaymentForm));
