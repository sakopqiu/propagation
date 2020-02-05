import * as React from 'react';
import {GameGraph} from './GameGraph/GameGraph';
import {isDebugMode, waitFor} from './utils';
import {ThreeNode} from './GameGraph/model/ThreeNode';
import {Vector3} from 'three';
import {ThreeEdge} from './GameGraph/model/ThreeEdge';
import ReactDOM from 'react-dom';
import InputNumber from 'antd/es/input-number'
import 'antd/es/input-number/style';
import {observable, runInAction} from 'mobx';
import './index.scss';
import {observer as hookObserver} from 'mobx-react-lite';
import {ThreeState} from "./GameGraph/ThreeState";

const ref = observable.object({
    state: null,
    totalNodes: 1000
});

async function loadInitialData() {
    await waitFor(500);
    const totalNodes = ref.totalNodes;
    const totalEdges = Math.floor(totalNodes / 100);
    const xRange = Math.ceil(Math.sqrt(totalNodes)) * 2;
    const yRange = Math.ceil(Math.sqrt(totalNodes)) * 2;
    const zRange = Math.ceil(Math.sqrt(totalNodes)) * 2;

    const nodes: ThreeNode[] = [];

    // gen nodes
    for (let i = 0; i < totalNodes; i++) {
        const id = 'mesh' + i;
        const node = new ThreeNode(id, id, '测试', {});

        const xDirection = Math.random() < 0.5 ? 1 : -1;
        const yDirection = Math.random() < 0.5 ? 1 : -1;
        const zDirection = Math.random() < 0.5 ? 1 : -1;
        node.position.set(
            (xRange * Math.random()) * xDirection,
            (yRange * Math.random()) * yDirection,
            (zRange * Math.random()) * zDirection,
        );
        nodes.push(node);
    }

    // geo lines
    let i = 0;
    const edges: ThreeEdge[] = [];
    while (true) {
        if (i === totalEdges) {
            break;
        }
        const random1 = Math.floor(Math.random() * nodes.length);
        const random2 = Math.floor(Math.random() * nodes.length);
        const key = random1 + '-' + random2;

        if (random1 !== random2) {
            const edge = new ThreeEdge(key, '测试', nodes[random1].id, nodes[random2].id, {});
            edges.push(edge);
            i++;
        }
    }

    return {nodes, edges};
}

const GameTest = hookObserver(function () {
    const state: ThreeState = ref.state as any;
    return (
        <div style={{width: '100%', height: '100%', position: 'relative'}}>
            {state &&
            <div className='game-banner'>
                <div>状态:&nbsp;{state.status}</div>
                <div>总人数:
                    <InputNumber
                        style={{marginLeft: 5}}
                        size='small'
                        min={300}
                        max={2000}
                        value={ref.totalNodes}
                        onChange={(val) => {
                            runInAction(() => {
                                ref.totalNodes = val || 1000;
                            })
                        }}
                        disabled={state.isPlaying || state.canContinue}/></div>
                <div>传播开始{state.days.toFixed(1)}天</div>
                <div><i className='icon healthy-icon'/>当前健康人数: {state.healthyMeshes.size}</div>
                <div><i className='icon infected-icon'/>当前感染人数: {state.infMeshes.size}</div>
                <div><i className='icon quarantine-icon'/>当前隔离人数: {state.qMeshes.size}</div>
            </div>
            }
            <GameGraph
                level1Name={'测试分支'}
                level2Name={'测试case'}
                threeConfigs={{
                    showStats: isDebugMode(),
                    renderer: {
                        antialias: false,
                    },
                    mesh: {
                        segments: 24,
                    },
                    camera: {
                        position: new Vector3(-120, 120, 120),
                    },
                }}
                events={{
                    onLoaded: (innerState) => {
                        runInAction(() => {
                            ref.state = innerState as any;
                        })
                    }
                }}
                initialData={loadInitialData}
                graphId={'testGraph'}
            />
        </div>
    );
});

ReactDOM.render(<GameTest/>, document.getElementById('root'));

