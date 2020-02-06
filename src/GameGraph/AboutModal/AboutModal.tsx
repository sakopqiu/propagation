import * as React from 'react';
import Modal from 'antd/es/modal';
import 'antd/es/modal/style'
import {ThreeState} from "../ThreeState";
import {observer as hookObserver} from 'mobx-react-lite';

export interface AboutModalProps {
    state: ThreeState;
}

export const AboutModal = hookObserver((props: AboutModalProps) => {
    const {state} = props;
    return (
        <Modal
            bodyStyle={{height: 400}}
            title="模拟传播"
            visible={state.modalVisible}
            onCancel={() => {
                state.setModalVisible(false);
            }}
            footer={null}
        >
            <div style={{height: '100%', overflowY: 'auto'}}>
                <h1>用法说明</h1>
                <p>
                    1.工具栏左侧可以调节模拟开始前的参数，一旦修改，当前模拟将结束
                </p>
                <p>
                    2.工具栏右侧在模拟过程中可以调整模拟速度，是否自动旋转
                </p>
                <p>
                    3.可以使用鼠标进行旋转，放大缩小等操作
                </p>
                <p>
                    4.为了更顺畅的运行效果,人数限定范围在500-2000之间，推荐使用chrome浏览器，并确保GPU加速选项被打开(新版本的Chrome已被设置自动打开)
                </p>
                <p>
                    5. 当系统内感染人数为0，模拟结束。当感染人数超过70%,模拟也会结束。
                </p>

                <h1>程序内部模型特性</h1>
                <p>
                    1."移动人数百分比"是个很重要的参数，越低代表人员流动性越低，也更加使得模拟能向好的方向进展。
                    假设人数为2000，百分比设置成70%，则代表每个时间周期内有1400人在移动。
                </p>
                <p>
                    2.系统在"延迟"天(比如10天)后开始使用病床接诊并隔离病人，感染者需要住院5-14天（正态分布）
                </p>
                <p>
                    3.感染者在移动的过程中，有70%可能性感染健康者。被隔离者虽然也属于感染者的范畴，但是其位置不会发生移动，但是也会对周边靠近他的健康者产生感染（几率设定为5%）
                </p>
                <h1>免责声明</h1>
                <p>
                    本模拟程序使用的模型非常简单，和真实世界相差甚远，不能作为任何预测分析的参考依据。
                    希望通过次程序让大家明白居家隔离的强大作用。
                    未经作者允许，请勿随意转载，也不作任何商业用途。
                </p>
            </div>
        </Modal>
    );
});
