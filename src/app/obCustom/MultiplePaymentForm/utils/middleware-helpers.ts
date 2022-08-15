/* eslint-disable @typescript-eslint/tslint/config */

const FB_URL = 'https://us-central1-de-pay-after-app.cloudfunctions.net'
// const FB_URL = 'http://localhost:5001/de-pay-after-app/us-central1';

export const createCustomer = async (billingAddress: any, nonce: string, customerId: string) => {

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
            customerId
        };

        return await fetch(`${FB_URL}/customer/create-customer`, {method: 'POST', body: JSON.stringify(requestData) } ).then(res => res.json());
    } catch (error) {
        console.error(error);

        return null;
    }
};

export const getCustomer = async (customerId: string) => {
    try {
        return await fetch(`${FB_URL}/customer/get-customer?customerId=${customerId}`).then(res => res.json());
    } catch (error) {
        console.error(error);

        return null;
    }
};

export const createSubscription = async (customerId: string, cartAmount: number, checkoutId: string, token: string) => {
    console.log(cartAmount, 'cartAmount')
    const requestData = {
        customerId,
        cartAmount,
        checkoutId,
        token
    }

    try {
        return await fetch(`${FB_URL}/customer/new-subscription`, { method: 'POST', body: JSON.stringify(requestData) }).then(res => res.json());
    } catch( error ) {
        console.error(error)
        return null
    }
}

export const addOrderIdToSubscription = async (orderId: number) => {
    const requestData = {
        orderId
    }

    try {
        return await fetch(`${FB_URL}/customer/add-order-id`, { method: 'POST', body: JSON.stringify(requestData) }).then(res => res.json());
    } catch( error ) {
        console.error(error)
        return null
    }
}

export const cancelSubscription = async (checkoutId: string) => {
    const requestData = {
        checkoutId
    }

    try {
        return await fetch(`${FB_URL}/customer/cancel-subscription`, { method: 'POST', body: JSON.stringify(requestData) }).then(res => res.json());
    } catch( error ) {
        console.error(error)
        return null
    }
}

export default () => {
    return {
        createCustomer,
        getCustomer,
        createSubscription
    }
}


