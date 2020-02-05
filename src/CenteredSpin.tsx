import Spin from 'antd/es/spin';
import 'antd/es/spin/style';
import * as React from 'react';

export interface CenteredSpinProps {
    tip?: string;
    style?: React.CSSProperties;
    size: 'small' | 'default' | 'large';
}

/**
 * 居中于容器中的加载效果组件
 */
export function CenteredSpin(props: CenteredSpinProps) {
    const style = Object.assign({
        position: 'absolute',
        left: '50%',
        top: '45%',
        transform: 'translateX(-50%) translateY(-50%)',
    }, props.style || {});

    return (
        <Spin
            size={props.size}
            style={style}
            tip={props.tip || '加载中...'}/>
    );
}
