/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable import/no-internal-modules */
import { Checkout, CheckoutSelectors, OrderRequestBody, PaymentMethod, RequestOptions } from '@bigcommerce/checkout-sdk';

import { Action, handleTokenError } from '../reducers/errorReducer';
import { LoadingActions } from '../reducers/loadingReducer';
import { TermsConditionsActions } from '../reducers/termsConditionsReducer';
import { ExistingCustomerState, TermsConditionsState } from '../types';

import { createCustomer, createSubscription } from './middleware-helpers';

interface HandleFormSubmitProps {
    method: PaymentMethod;
    termsConditions: TermsConditionsState;
    existingCustomer: ExistingCustomerState;
    checkout: Checkout;
    hostedFields: any;
    setSubmitDisabled(disabled?: boolean): void;
    setIsLoadingNotif(isLoading: boolean): void;
    dispatchTermsConditions(action: Action): void;
    dispatchLoading(action: Action): void;
    dispatchFormError(action: Action): void;
    handleModalError(message?: string, title?: string): void;
    setSubscriptionCreated(created: boolean): void;
    submitOrder(payload: OrderRequestBody, options?: RequestOptions<{}> | undefined): Promise<CheckoutSelectors>;
    onSubmit: () => void
}

const handleFormSubmit = ({
    termsConditions,
    existingCustomer,
    checkout,
    hostedFields,
    setSubmitDisabled: disableSubmit,
    dispatchTermsConditions,
    dispatchLoading,
    dispatchFormError,
    handleModalError,
    setSubscriptionCreated,
    submitOrder,
    setIsLoadingNotif,
    onSubmit: navToOrderConfirmation
}: HandleFormSubmitProps) => {
    console.log('submit')
    disableSubmit(true);

    const { isChecked } = termsConditions;
    
    if ( isChecked ) {
        dispatchTermsConditions({ type: TermsConditionsActions.hideError });
        const { isLoaded, currentCard } = existingCustomer;
        setIsLoadingNotif(true)
        
        isLoaded && currentCard
            ? handleSavedCardSubmit({ 
                existingCustomer, 
                checkout, 
                setSubscriptionCreated, 
                handleModalError
            })
            : handleNewCardSubmit({ 
                disableSubmit, 
                dispatchLoading, 
                dispatchFormError, 
                checkout, 
                submitOrder, 
                hostedFields, 
                handleModalError, 
                setSubscriptionCreated,
                navToOrderConfirmation,
            });

    } else {
        dispatchTermsConditions({ type: TermsConditionsActions.showError });
        disableSubmit(false);
    }
};
// @ts-ignore
const handleNewCardSubmit = ({
    disableSubmit,
    dispatchLoading,
    dispatchFormError,
    checkout,
    setSubscriptionCreated,
    handleModalError,
    hostedFields,
}: any) => {
    
    const { billingAddress } = checkout;
    console.log('tokening...')
    // @ts-ignore
    hostedFields?.tokenize((err: any, payload: any) => {
        if ( err ) {
            disableSubmit(false);
            dispatchLoading({ type: LoadingActions.BrainTreeIdle});
            handleTokenError(err, dispatchFormError);
        } else {
            handleTokenSuccess(
                payload,
                billingAddress,
                checkout,
                setSubscriptionCreated,
                handleModalError,
                );
        }
    });
};
// @ts-ignore
const handleSavedCardSubmit = ({ existingCustomer, checkout, setSubscriptionCreated, handleModalError }) => {
    const { currentCard } = existingCustomer;

    if (currentCard) {
        const { token = '' } = currentCard;
        handleCreateSubscription(checkout, token, setSubscriptionCreated, handleModalError);
    }
};

const handleTokenSuccess = async (
    payload: any,
    billingAddress: any,
    checkout: any,
    setSubscriptionCreated: (state: boolean) => void,
    handleModalError: (message?: string, title?: string) => void,
    ) => {
    
    const { nonce } = payload;
    const { customer } = checkout;
    
    const { error, success, data } = await createCustomer(billingAddress, nonce, customer.id);
    console.log({error, success, data})
    success
        ? handleCustomerSuccess(data, checkout, setSubscriptionCreated, handleModalError)
        : handleCustomerError(handleModalError, error);
};

const handleCustomerSuccess = async (
        customerData: any,
        checkout: any,
        setSubscriptionCreated: (state: boolean) => void,
        handleModalError: (message?: string, title?: string) => void,
        ) => {
        
    try {
        const { paymentMethods } = customerData;

        const token = paymentMethods[0]?.token;
        
        handleCreateSubscription(checkout, token, setSubscriptionCreated, handleModalError);
        
    } catch (error) {
        console.error(error);
        handleModalError();
    }
};

const handleCreateSubscription = async (
    checkout: any,
    token: string,
    setSubscriptionCreated: (state: boolean) => void,
    handleModalError: (message?: string, title?: string) => void,
    ) => {
        const { cart, id, grandTotal } = checkout;
        
        const { customerId } = cart;
        
        const data = await createSubscription(customerId, grandTotal, id, token);

        const { success = false } = data;
        if (success) {
            setSubscriptionCreated(true)
        } else {
            console.error('Failed to create sub');
            handleModalError()
        }
};

const handleCustomerError = (
        handleModalError: (message?: string, title?: string) => void,
        response: any
    ) => {

    const {
        verificationError,
        message
    } = response;

    if (verificationError) {
        return handleModalError(message);
    }

    return handleModalError();
};

export default handleFormSubmit;
