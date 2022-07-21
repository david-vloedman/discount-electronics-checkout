/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable import/no-internal-modules */
import classNames from 'classnames';
import React, {  useEffect, useReducer, useState } from 'react';

import { withCheckout, CheckoutContextProps } from '../../checkout';
import { MapToPropsFactory } from '../../common/hoc';
import withPayment from '../../payment/withPayment';
import { IconLock } from '../../ui/icon';
import { LoadingOverlay } from '../../ui/loading';

import { errorReducer, handleTokenError, initialFormErrorStates, ActionTypes, Action } from './reducers/errorReducer';
import { createCustomer, getCustomer, createSubscription } from './utils/middleware-helpers';
import FormFieldError from './FormFieldError';
import MultiplePaymentErrorModal from './MultiplePaymentErrorModal';
import SavedCardForm from './SavedCardForm';
import { ExistingCustomerState, LoadingState, SavedCard, VisibilityState } from './types';
import { termsConditionsReducer, TermsConditionsActions } from './reducers/termsConditionsReducer';
import { VisibilityActions, visibilityReducer } from './reducers/visibilityReducer';
import { loadingReducer, LoadingActions } from './reducers/loadingReducer';

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

const initialExistingCustomer: ExistingCustomerState = {
    isLoaded: false,
    customer: null,
    currentCard: null,
};

const initialVisibilityState: VisibilityState = {
    existingCards: false,
    newCard: false,
};

const initialLoadingState: LoadingState = {
    btLoading: false,
    ez3Loading: false,
};

const initialTCErrorState = {
    showError: false,
    isChecked: false,
};

const MultiplePaymentForm = (props: any) => {
    const {
        billingAddress,
        customer,
        disableSubmit,
        method,
        navToLoginStep,
        setSubmit,
        checkout,
        submitOrder,
        onSubmit
    } = props;

    const [{
        cardholderName,
        number,
        cvv,
        expirationDate,
    } , dispatchFormAction] = useReducer(errorReducer, initialFormErrorStates);

    const [isLoading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState);
    const [errorModalState, updateErrorModalState] = useState( () => initialErrorModalState );
    const [existingCustomer, updateExistingCustomer] = useState( () => initialExistingCustomer );
    const [visibilityState, dispatchVisibilityAction] = useReducer(visibilityReducer, initialVisibilityState);
    const [termsConditions, dispatchTermsConditions] = useReducer(termsConditionsReducer, initialTCErrorState);
    const [btInstance, setBTInstance] = useState( () => null );
    const [btClient, setBTClient] = useState( () => null );
    const [hostedFields, setHostedFields] = useState( () => null );
    const [subscriptionCreated, setSubscriptionCreated] = useState(() => false)
    /**
     * 
     *  Braintree Set Up
     * 
     */
    const setupNewPaymentForm = (err: any, hostedFieldsInstance: any) => {
        if (err) {
            return console.log('MultiplePaymentForm -> setupForm error:', err);
        }
        
        setHostedFields(hostedFieldsInstance);

        hostedFieldsInstance.on('focus', (e: any) =>
            dispatchFormAction({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );

        dispatchLoading({ type: LoadingActions.BrainTreeIdle });
    };

    const handleBraintree = (err: any, clientInstance: any)  => {
        if (err) {
            dispatchLoading({ type: LoadingActions.BrainTreeIdle });

            return console.log('MultiplePaymentForm -> handleBraintree error:', err);
        }

        setBTClient(clientInstance);
    };

    const handleHostedFields = () => {
        if (!btInstance || !btClient) {
            return console.error('handleHostedFields -> Braintree not initialized');
        }

        dispatchLoading({ type: LoadingActions.BrainTreeLoading })
        // @ts-ignore
        const { hostedFields: { create } } = btInstance;
        // @ts-ignore
        create({
            client: btClient,
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

        dispatchLoading({ type: LoadingActions.BrainTreeIdle });
    };

    /**
     * 
     *  Form Submit
     * 
     */
    const handleFormSubmit = () => {
        disableSubmit(method, true)

        const { isChecked } = termsConditions;

        if( isChecked ) {
            dispatchTermsConditions({ type: TermsConditionsActions.hideError });
            const { isLoaded, currentCard } = existingCustomer;
            dispatchLoading({ type: LoadingActions.BrainTreeLoading})
            isLoaded && currentCard
                ? handleSavedCardSubmit()
                : handleNewCardSubmit();
        } else {
            dispatchTermsConditions({ type: TermsConditionsActions.showError });
            disableSubmit(method, false)
        }
    };

    const handleNewCardSubmit = () => {
        // @ts-ignore
        hostedFields?.tokenize((err: any, payload: any) => {
            if( err ) {
                disableSubmit(method, false) 
                dispatchLoading({ type: LoadingActions.BrainTreeIdle})
                handleTokenError(err, dispatchFormAction)
            } else {
                handleTokenSuccess(
                    payload, 
                    billingAddress, 
                    checkout, 
                    setSubscriptionCreated,  
                    handleModalError, 
                    dispatchLoading
                )
            }
        });
    };

    const handleSavedCardSubmit = () => {
        const { currentCard } = existingCustomer
        if(currentCard) {
            const { token = '' } = currentCard
            handleCreateSubscription(checkout, token, setSubscriptionCreated)
        }
    };

    const handleOrderCreation = async () => {
        try {
            await submitOrder({
                payment: {
                    methodId: method.id,
                    paymentData: {
                        terms: true,
                        shouldCreateAccount: true,
                        shouldSaveInstrument: false
                    }
                }
            })
            
            onSubmit();

        } catch(error) {
            console.error('Order submit error')
        }
    }
    /**
     * 
     *  Misc
     * 
     */
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
            currentCard: card,
        }));

    const toggleTermsConditionsChecked = () => dispatchTermsConditions({ type: TermsConditionsActions.toggleTermsConditionsChecked });

    /**
     *
     *  Side effects
     *
     */
    // useEffect(() => console.log('existing customer', existingCustomer), [existingCustomer])
    // useEffect(() => console.log(isLoading), [isLoading])
    // useEffect(() => console.log(visibilityState), [visibilityState])
    // useEffect(() => console.log('conditions', termsConditions), [termsConditions])
    /*  Component Mount/Unmount */
    useEffect(() => {
        const tryGetCustomer = async () => {
            dispatchLoading({ type: LoadingActions.EZ3Loading });

            const { email } = billingAddress;

            try {
                const { data = null } = await getCustomer(email);

                if ( data ) {
                    const { savedCards } = data;
                    // @ts-ignore
                    const defaultCard = savedCards?.find(({ isDefault }) => isDefault);
                    dispatchVisibilityAction({ type: VisibilityActions.toggleExistingCard });
                    updateExistingCustomer(state => ({
                        ...state,
                        isLoaded: true,
                        customer: data,
                        currentCard: defaultCard,
                    }));
                    // end braintree loading, hosted fields aren't present
                    dispatchLoading({ type: LoadingActions.BrainTreeIdle })
                } else {
                    dispatchVisibilityAction({ type: VisibilityActions.toggleNewCard });
                    updateExistingCustomer(state => ({
                        ...state,
                        isLoaded: true,
                    }));
                }

            } catch (error) {
                console.error(error);
                updateExistingCustomer(state => ({
                    ...state,
                    isLoaded: true,
                }));
            }

            dispatchLoading({ type: LoadingActions.EZ3Idle });
        };

        const initializeBraintree = () => {

            dispatchLoading( { type: LoadingActions.BrainTreeLoading });
            if (customer.isGuest) { return; }
            // @ts-ignore
            const { braintree = null } = window;

            if (braintree) {

                setBTInstance(braintree);

                const { client: { create } } = braintree;

                create(
                    {
                        authorization: 'sandbox_mfz33jgw_gvxp8cg7y9jydy5v',
                    },
                    handleBraintree
                );
            } else {
                console.error('Braintree not found');
                dispatchLoading({ type: LoadingActions.BrainTreeIdle });
            }
        };

        disableSubmit(method, customer.isGuest);

        if ( ! customer.isGuest ) {
            setSubmit(method, handleFormSubmit);
            tryGetCustomer();
            initializeBraintree();
        }

        return () => {
            // @ts-ignore
            btClient?.teardown();
            // @ts-ignore
            hostedFields?.teardown();
        };
    }, []);

    useEffect(() => {
        if (!btInstance || !btClient) { return; }

        const { newCard: newCardFormVisible } = visibilityState;

        if (newCardFormVisible) {
            handleHostedFields();
        }

    }, [visibilityState, btClient, btInstance]);

    useEffect(() => {
        if(subscriptionCreated) {
            handleOrderCreation()
        }
    }, [subscriptionCreated])

    /*
        This is pretty important. the setSubmit hook memoizes the submit handler we send to it.
        This means that state values used in the submit handler are cached. If we set the submit
        only when the component mounts, it will use the initial state variables.
    */
    useEffect(() => {
        setSubmit(method, handleFormSubmit);
    }, [termsConditions, existingCustomer]);

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
                    <div className={ classNames('form-field', { ['form-field--error']: termsConditions.showError }) } onClick={ toggleTermsConditionsChecked }>

                        <input
                            checked={ termsConditions.isChecked }
                            className="form-checkbox optimizedCheckout-form-checkbox"
                            name="ez3-terms"

                            type="checkbox"
                        />
                        <label className="form-label optimizedCheckout-form-label">
                            Yes, I agree with the above terms and conditions
                        </label>
                        <FormFieldError hasError={ termsConditions.showError } message={ 'Please agree to the terms and conditions' } name={ 'termsConditions' } />
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
        checkout: any,
        setSubscriptionCreated: (state: boolean) => void,
        handleModalError: (message: string, title: string) => void,
        dispatchLoading: (action: Action) => void
    ) => {
    const { nonce } = payload;
    const { customer } = checkout;

    const { error, success, data } = await createCustomer(billingAddress, nonce, customer.id);
    
    success
        ? handleCustomerSuccess(data, checkout, setSubscriptionCreated)
        : handleCustomerError(handleModalError, error);
};

const handleCustomerSuccess = async (
        customerData: any, 
        checkout: any,
        setSubscriptionCreated: (state: boolean) => void
    ) => {

    const { paymentMethods } = customerData;

    const token = paymentMethods[0]?.token;
    
    handleCreateSubscription(checkout, token, setSubscriptionCreated)
    
};

const handleCreateSubscription = async (
    checkout: any, 
    token: string,
    setSubscriptionCreated: (state: boolean) => void
    ) => {
        const { cart, id } = checkout;
        const { customerId, cartAmount } = cart;
        const subPrice = parseFloat(cartAmount) / 3;
        
        const data = await createSubscription(customerId, subPrice, id, token);
        console.log(data)
        const { success } = data
        if(success) {
            return setSubscriptionCreated(true)
        } else {
            console.error('Failed to create sub')        
        }
}

const handleCustomerError = (
        handleModalError: (message: string, title: string) => void, response: any
    ) => {

    const {
        verificationError,
    } = response;
    const title = "Something's gone wrong";

    if (verificationError) {
        const message = "We're experiencing difficulty processing your transaction. Please contact us or try again later.";
        return handleModalError(message, title);
    }

    const { message } = response
    return handleModalError(message, title)
};

const mapFromCheckoutProps: MapToPropsFactory<CheckoutContextProps, any, any> = () => {
    return (context, props) => {

        const {
            method,
        } = props;
        
        const { checkoutState, checkoutService } = context;
        console.log(checkoutService)
        const {
            data: {
                getCheckout,
                getConfig,
                getCustomer,
                getBillingAddress,
            },

        } = checkoutState;

        const {
            submitOrder,
            initializePayment,
            finalizeOrderIfNeeded
        } = checkoutService

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
            checkout,
            submitOrder,
            initializePayment,
            finalizeOrderIfNeeded
        };
    };
};

export default withPayment(withCheckout(mapFromCheckoutProps)(MultiplePaymentForm));
