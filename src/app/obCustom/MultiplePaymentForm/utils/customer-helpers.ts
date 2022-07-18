/* eslint-disable @typescript-eslint/tslint/config */

// const FB_URL = 'https://us-central1-de-pay-after-app.cloudfunctions.net'
const LOCAL_URL = 'http://localhost:5001/de-pay-after-app/us-central1';

export const createCustomer = async (billingAddress: any, nonce: string) => {

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

        return await fetch(`${LOCAL_URL}/customer/create-customer`, {method: 'POST', body: JSON.stringify(requestData) } ).then(res => res.json());
    } catch (error) {
        console.error(error);

        return null;
    }
};

export const getCustomer = async (email: string) => {
    try {
        return await fetch(`${LOCAL_URL}/customer/get-customer?email=${email}`).then(res => res.json());
    } catch (error) {
        console.error(error);

        return null;
    }
};

export default () => {
    return {
        createCustomer,
        getCustomer
    }
}
