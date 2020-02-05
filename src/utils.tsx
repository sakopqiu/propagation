import message from 'antd/es/message';
import 'antd/es/message/style';
import * as React from 'react';

export function showMessage(s: string | React.ReactNode, duration: number = 2, toBottom: number = 70) {
    message.destroy();
    message.config({
        top: window.innerHeight - toBottom,
        duration,
    });
    message.success(s);
}

export function useForceUpdate() {
    const [, setTick] = React.useState(0);
    const update = React.useCallback(() => {
        setTick(tick => tick + 1);
    }, []);
    return update;
}

export async function waitFor(milliseconds: number) {
    const promise = new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
    await promise;
}

export function isDebugMode() {
    return document.cookie.includes('debug');
}
