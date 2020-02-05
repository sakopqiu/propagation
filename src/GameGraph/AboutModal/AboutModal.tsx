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
                    4.为了更顺畅的运行效果,推荐使用chrome浏览器，并确保GPU加速选项被打开
                </p>

                <h1>使用注意项</h1>
                <p>
                    1."移动人数百分比"是个很重要的参数，越低代表人员流动性越低，也更加使得模拟能向好的方向进展
                </p>
                <p>
                    2.感染者在移动的过程中，有70%可以感染健康者。被隔离者位置不会发生移动，但是也会对周边的健康者产生感染（几率设定为5%）
                </p>
                <p>
                    3.感染者隔离在病床后，需要住院5-14天（正态分布）
                </p>
                <h1>免责声明</h1>
                <p>
                    本模拟程序使用的模型非常简单，和真实世界相差甚远，不能作为任何预测分析的参考依据。
                    未经作者允许，不作任何商业用途。
                </p>
            </div>
        </Modal>
    );
});
