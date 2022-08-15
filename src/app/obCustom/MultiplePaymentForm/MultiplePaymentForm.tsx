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

import { errorReducer, initialFormErrorStates, ActionTypes } from './reducers/errorReducer';
import { cancelSubscription, getCustomer } from './utils/middleware-helpers';
import FormFieldError from './FormFieldError';
import MultiplePaymentErrorModal from './MultiplePaymentErrorModal';
import SavedCardForm from './SavedCardForm';
import { ExistingCustomerState, LoadingState, SavedCard, TermsConditionsState, VisibilityState } from './types';
import { termsConditionsReducer, TermsConditionsActions } from './reducers/termsConditionsReducer';
import { VisibilityActions, visibilityReducer } from './reducers/visibilityReducer';
import { loadingReducer, LoadingActions } from './reducers/loadingReducer';
import handleFormSubmit from './utils/checkout-submit';
import { LoadingNotification } from '../../ui/loading';
import PaymentSchedule from './PaymentSchedule';


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

const initialTCErrorState: TermsConditionsState = {
    showError: false,
    isChecked: false,
};

const MultiplePaymentForm = (props: any) => {
    const {
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
    } , dispatchFormError] = useReducer(errorReducer, initialFormErrorStates);

    const [isLoading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState);
    const [errorModalState, updateErrorModalState] = useState( () => initialErrorModalState );
    const [existingCustomer, updateExistingCustomer] = useState( () => initialExistingCustomer );
    const [visibilityState, dispatchVisibility] = useReducer(visibilityReducer, initialVisibilityState);
    const [termsConditions, dispatchTermsConditions] = useReducer(termsConditionsReducer, initialTCErrorState);
    const [btInstance, setBTInstance] = useState( () => null );
    const [btClient, setBTClient] = useState( () => null );
    const [hostedFields, setHostedFields] = useState( () => null );
    const [subscriptionCreated, setSubscriptionCreated] = useState(() => false)
    const [isLoadingNotif, setIsLoadingNotif] = useState(() => false)
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
            dispatchFormError({type: ActionTypes.inputFocus, payload: e.emittedBy})
        );

        dispatchLoading({ type: LoadingActions.BrainTreeIdle });
    };

    const handleBraintree = (err: any, clientInstance: any)  => {
        if (err) {
            // dispatchLoading({ type: LoadingActions.BrainTreeIdle });
            handleModalError('Payment processor is not responding. Please contact us or try again later.')
            return console.log('MultiplePaymentForm -> handleBraintree error:', err);
        }

        setBTClient(clientInstance);
    };

    const handleHostedFields = () => {
        if (!btInstance || !btClient) {
            handleModalError();
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
    const onFormSubmit = () => {
        // @ts-ignore
        handleFormSubmit({
            termsConditions,
            existingCustomer,
            checkout,
            hostedFields,
            setSubmitDisabled,
            dispatchTermsConditions,
            dispatchLoading,
            dispatchFormError,
            handleModalError,
            setSubscriptionCreated,
            submitOrder,
            setIsLoadingNotif,
        })
    }

    const handleOrderCreation = async () => {
        try {
            setIsLoadingNotif(false)
            await submitOrder({
                payment: {
                    methodId: 'cod',
                    paymentData: {
                        terms: true,
                        shouldCreateAccount: true,
                        shouldSaveInstrument: false,
                    },
                },
            });
            
            onSubmit();
        } catch (error) {
            const { id } = checkout
            cancelSubscription(id)
            console.error('Order submit error', error);
            handleModalError('Failed to process order. Please contact us or try again later.');
        }
    };
    /**
     * 
     *  Misc
     * 
     */

    const setSubmitDisabled = (disabled: boolean) => disableSubmit(method, disabled)

    const handleSignInClick = (e: any) => {
        e.preventDefault();
        navToLoginStep();
    };

    const handleErrorModalClose = () => 
        updateErrorModalState(initialErrorModalState);
    

    const handleModalError = (message?: string, title?: string) => {
        const defaultTitle = "Something's gone wrong";
        const defaultMessage = "Please contact us or try again later."
        
        message = message || defaultMessage
        title = title || defaultTitle

        updateErrorModalState({
            hasError: true,
            message,
            title,
        });
        disableSubmit(method, false)
        dispatchLoading({ type: LoadingActions.BrainTreeIdle })
        dispatchLoading({ type: LoadingActions.EZ3Idle })
    }
        

    const setExistingCustomerCard = (card: SavedCard) =>
        updateExistingCustomer(state => ({
            ...state,
            currentCard: card,
        }));

    const toggleTermsConditionsChecked = () => dispatchTermsConditions({ type: TermsConditionsActions.toggleTermsConditionsChecked });

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
                    authorization: 'production_pgpm3b76_k9xtwdttfsb5n9x5',
                },
                handleBraintree
            );
        } else {
            console.error('Braintree not found');
            handleModalError()
        }
    };

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

            const { customer: { id } } = checkout

            try {
                const { data = null } = await getCustomer(id);

                if ( data ) {
                    const { savedCards } = data;
                    // @ts-ignore
                    const defaultCard = savedCards?.find(({ isDefault }) => isDefault);
                    dispatchVisibility({ type: VisibilityActions.toggleExistingCard });
                    updateExistingCustomer(state => ({
                        ...state,
                        isLoaded: true,
                        customer: data,
                        currentCard: defaultCard,
                    }));
                    // end braintree loading, hosted fields aren't present
                    dispatchLoading({ type: LoadingActions.BrainTreeIdle })
                } else {
                    dispatchVisibility({ type: VisibilityActions.toggleNewCard });
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


        disableSubmit(method, customer.isGuest);

        if ( ! customer.isGuest ) {
            setSubmit(method, onSubmit);
            tryGetCustomer();
            // initializeBraintree();
        }

        return () => {
            // @ts-ignore
            btClient?.teardown();
            // @ts-ignore
            hostedFields?.teardown();
        };
    }, []);

    const [scriptsLoaded, setScriptsLoaded] = useState(() => ({
        hostedFields: false,
        client: false,
    }))

    useEffect(() => {
        const hostedFields = 'https://js.braintreegateway.com/web/3.85.5/js/hosted-fields.min.js'
        const client = 'https://js.braintreegateway.com/web/3.85.5/js/client.min.js'

        const clientTag = document.createElement('script')
        clientTag.src = client
        clientTag.addEventListener('load',() => setScriptsLoaded(state => ({
            ...state,
            client: true
        })))

        document.body.appendChild(clientTag)

        const hostedFieldsTag = document.createElement('script')
        hostedFieldsTag.src = hostedFields
        hostedFieldsTag.addEventListener('load',() => setScriptsLoaded(state => ({
            ...state,
            hostedFields: true
        })))

        document.body.appendChild(hostedFieldsTag)
    }, [])

    useEffect(() => {
        const { hostedFields, client } = scriptsLoaded
        if (hostedFields && client) {
            initializeBraintree()
        }
    }, [scriptsLoaded])

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
        setSubmit(method, onFormSubmit);
    }, [termsConditions, existingCustomer]);

    const {subtotal} = checkout
    
    const belowPriceThreshold = subtotal < 600
    
    const showPayment = ! customer.isGuest && ! belowPriceThreshold

    return (
        <div className="paymentMethod paymentMethod--creditCard">
            {
                showPayment ||
                    <div>
                        {
                            customer.isGuest &&
                            <>
                                    You must
                                    <a href="#" onClick={ handleSignInClick }> sign-in or create an account</a>
                                    to use 3 Easy Payments.
                            </>
                        }
                        {
                            belowPriceThreshold &&
                            <p>
                                Order total must be $600.00 or more to qualify for 3 Easy Payments
                            </p>
                        }
                    
                    </div>
            }

            {
                showPayment &&
                <LoadingOverlay hideContentWhenLoading={ true } isLoading={ isLoading.btLoading || isLoading.ez3Loading }>

                    <div className="form-ccFields">
                        <PaymentSchedule orderTotal={ checkout?.grandTotal } />
                        {
                            visibilityState.existingCards &&
                            <SavedCardForm currentCard={ existingCustomer.currentCard } dispatchVisibility={ dispatchVisibility } savedCards={ existingCustomer.customer?.savedCards } setCurrentCard={ setExistingCustomerCard } />
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

                     <div className={ classNames('form-field', { ['form-field--error']: termsConditions.showError }) } onClick={ toggleTermsConditionsChecked }>
                        <input
                            checked={ termsConditions.isChecked }
                            className="form-checkbox optimizedCheckout-form-checkbox"
                            name="ez3-terms"

                            type="checkbox"
                        />
                        <label className="form-label optimizedCheckout-form-label">
                            Yes, I agree with the  
                            <a href="/warranty-returns-shipping" target="_blank"> terms and conditions</a>
                        </label>
                        <FormFieldError hasError={ termsConditions.showError } message={ 'Please agree to the terms and conditions' } name={ 'termsConditions' } />
                    </div>

                </LoadingOverlay>
            }
            <LoadingNotification isLoading={ isLoadingNotif } />
            <MultiplePaymentErrorModal
                isOpen={ errorModalState.hasError }
                message={ errorModalState.message }
                onClose= { handleErrorModalClose }
                title={ errorModalState.title }
            />
        </div>
    );
};

const mapFromCheckoutProps: MapToPropsFactory<CheckoutContextProps, any, any> = () => {
    return (context, props) => {

        const {
            method,
        } = props;
        
        const { checkoutState, checkoutService } = context;
        
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
