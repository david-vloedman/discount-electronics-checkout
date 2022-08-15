// @ts-nocheck
import React from 'react';

const containerStyles = {
    display: 'flex',
    gap: '39px',
    listStyle: 'none',
    marginBottom: '1rem',
    marginLeft: '0',
    paddingLeft: '0.75rem',
};

const paymentInfoStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
};

const countStyles = {
    background: 'white',
    borderRadius: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '28px',
    height: '28px',
    fontFamily: 'Oswald',
    fontWeight: '700',
    fontSize: '14px',
    color: '#333',
};

const paymentStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

const amountStyles = {
    fontFamily: 'Lato',
    fontWeight: '400',
    color: '#333',
    fontSize: '17px',
};

const dateStyles = {
    fontFamily: 'Lato',
    fontWeight: '400',
    color: '#757575',
    fontSize: '12.5px',
};

const PaymentSchedule = ({ orderTotal }: { orderTotal: number }) => {

    const payments = createPaymentArray(orderTotal, 3);

    return (
        <ul style={ containerStyles }>
            {
                payments.map(
                    ({ amount, date }, i) => {
                        return (
                            <li key={ Math.random() } style={ paymentStyles }>
                                <div style={ countStyles }>
                                    { i + 1 }
                                </div>
                                <div style={ paymentInfoStyles }>
                                    <div style={ amountStyles }>{ `$${amount}` }</div>
                                    <div style={ dateStyles }>{ date }</div>
                                </div>
                            </li>
                        );
                    }
                )
            }
        </ul>
    );
};

export default PaymentSchedule;

// @ts-ignore
const createPaymentArray = (cartTotal, divideBy) => {
    if ( ! cartTotal || ! divideBy ) { return []; }

    const onePayment = Number(toFixedNoRound(cartTotal / divideBy, 2));
    const allButOnePayment = onePayment * ( divideBy - 1 );
    const remainder = Number(toFixedNoRound(cartTotal - allButOnePayment, 2));
    const today = new Date().toLocaleDateString();
    const prices = [...new Array(divideBy)].map(
        (_, i) => {
            return {
                amount: i === 0 ? remainder : onePayment,
                date: i === 0 ? 'Due Today' : addDaysToDate(today, i * 31).toLocaleDateString(),
            };
        }
    );

    return prices;
};

const toFixedNoRound = (num, fixed) => {
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');

    return num.toString().match(re)[0];
};

const addDaysToDate = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);

    return result;
};
