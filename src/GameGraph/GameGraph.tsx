import * as React from 'react';
import {useRef} from 'react';
import {DirectionalLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {DragControls} from 'three/examples/jsm/controls/DragControls';
import _debounce from 'lodash/debounce';
import _get from 'lodash/get';
import {ThreeState} from './ThreeState';
import {ThreeNode} from './model/ThreeNode';
import Switch from 'antd/es/switch';
import 'antd/es/switch/style';
import Slider, {SliderValue} from 'antd/es/slider';
import 'antd/es/slider/style';
import Button from 'antd/es/button';
import 'antd/es/button/style';
import Radio from 'antd/es/radio';
import 'antd/es/radio/style';
import Tooltip from 'antd/es/tooltip';
import 'antd/es/tooltip/style';

const movingSpeedFunc = random.uniform(.5, 1.2);
import {
    defaultGeometry,
    defaultMaterial,
    disposeWebglResources,
    GameGraphProps,
    infectedMaterial,
    initStats,
    isSphere,
    quaratineMaterial,
    removeExistingStats,
    TempMesh,
} from './GameGraphUtils';
import {CenteredSpin} from '../CenteredSpin';
import './index.scss';
import random from 'random';
import {showMessage} from '../utils';
import {observer as hookObserver} from 'mobx-react-lite';
import {runInAction} from "mobx";
import {AboutModal} from "./AboutModal/AboutModal";

export const GameGraph = hookObserver((props: GameGraphProps) => {
    const rendererRef: React.MutableRefObject<WebGLRenderer> = useRef(null as any);
    const sceneRef: React.RefObject<Scene> = useRef(new Scene());
    const cameraRef: React.MutableRefObject<PerspectiveCamera> = useRef(null as any);
    const requestAnimationId = useRef(-1);

    const divRef: React.RefObject<HTMLDivElement> = useRef(document.createElement('div'));
    const scene = sceneRef.current!;
    const directionalLightRef: React.RefObject<DirectionalLight> = useRef(new DirectionalLight('#ffffff'));
    const directionalLight = directionalLightRef.current!;
    const stateRef: React.MutableRefObject<ThreeState> = useRef(new ThreeState());
    const state = stateRef.current;
    const boundingBoxRef: React.MutableRefObject<ClientRect> = useRef(null as any);
    const orbitControlRef: React.MutableRefObject<OrbitControls> = useRef(null as any);

    const [inited, setInited] = React.useState(false);

    const mainGeom = defaultGeometry(props);
    const sphereSize = _get(props.threeConfigs, 'mesh.size', 1);

    const mainMaterial = defaultMaterial(props);
    const infMaterial = infectedMaterial(props);
    const qMaterial = quaratineMaterial(props);

    const addSphere = React.useCallback((node: ThreeNode) => {
        const mesh = new Mesh(mainGeom, mainMaterial);
        // mesh的名字使用的是node的id，其实应该复制mesh.id=node.id，但是mesh.id在three.js中只能是number，所以只能借用name属性了
        mesh.name = node.id;
        mesh.position.copy(node.position);
        scene.add(mesh);
        return mesh;
    }, []);

    const [movingPercentage, setMovingPercentage] = React.useState(5);

    // 模拟进行天数，假设20天后人们才意识到
    const [initBeds, setInitBeds] = React.useState(10);
    // 初始感染人数
    const [initInfectedCount, setInitInfectedCount] = React.useState(10);

    function quarantineNodes() {
        if (state.stillUnaware) {
            return;
        }
        runInAction(() => {
            const recoverPeople: TempMesh[] = [];
            for (const q of state.qMeshes.values()) {
                q.quarantineDays -= state.daysPerFrame;// 天数是放马
                if (q.quarantineDays <= 0) {
                    recoverPeople.push(q);
                }
            }
            for (const q of recoverPeople) {
                state.qMeshes.delete(q.id);
                state.infMeshes.delete(q.id);
                state.healthyMeshes.set(q.id, q);
                q.quarantineDays = 0;
                q.material = mainMaterial;
            }

            let remainingBeds = initBeds - state.qMeshes.size;

            const happySickPeople: TempMesh[] = [];
            // 用迭代器提高性能，不一下子把数组都展开
            const iter = state.infMeshes.values();
            while (remainingBeds > 0) {
                const n = iter.next();
                if (n.done) {
                    break;
                }
                const sick = n.value as TempMesh;
                if (!state.qMeshes.has(sick.id)) {
                    happySickPeople.push(sick);
                    remainingBeds--;
                }
            }

            happySickPeople.forEach((sick: TempMesh) => {
                // 平均治疗5-14天
                sick.quarantineDays = random.uniformInt(5, 14)();
                sick.material = qMaterial;
                state.qMeshes.set(sick.id, sick);
            });
        });
    }

    let fpsStat: any; // 用于测试用的fps观测器
    let dragControl: DragControls;

    function resize() {
        const camera = cameraRef.current!;
        const div = divRef.current!;
        const boundingBox = div.getBoundingClientRect();
        camera.aspect = boundingBox.width / boundingBox.height;
        camera.updateProjectionMatrix();
        rendererRef.current!.setSize(boundingBox.width, boundingBox.height);
        boundingBoxRef.current = boundingBox;
    }

    const debouncedResize = _debounce(resize, 200);

    function initRendererAndCamera() {
        const div = divRef.current!;
        const boundingBox = div.getBoundingClientRect();
        boundingBoxRef.current = boundingBox;
        const antialias = _get(props.threeConfigs, 'renderer.antialias', false);
        rendererRef.current = new WebGLRenderer({antialias});
        const backgroundColor = _get(props.threeConfigs, 'renderer.backgroundColor', '#ffffff');
        rendererRef.current.setClearColor(backgroundColor as any);
        rendererRef.current.setSize(boundingBox.width, boundingBox.height);
        rendererRef.current.shadowMap.enabled = true;
        document.getElementById(props.graphId)!.appendChild(rendererRef.current!.domElement);

        const fov = _get(props.threeConfigs, 'camera.fov', 45);
        const near = _get(props.threeConfigs, 'camera.near', .1);
        const far = _get(props.threeConfigs, 'camera.far', 4000);
        const camera = new PerspectiveCamera(fov, boundingBox.width / boundingBox.height, near, far);
        scene.add(camera);
        const cameraPosition = _get(props.threeConfigs, 'camera.position', new Vector3(-20, 20, 20));
        camera.position.copy(cameraPosition);
        camera.lookAt(scene.position);
        cameraRef.current = camera;
    }

    function initControls() {
        const camera = cameraRef.current!;
        orbitControlRef.current = new OrbitControls(camera, rendererRef.current!.domElement);
        dragControl = new DragControls(scene.children.filter((c) => {
            return isSphere(c);
        }), camera, rendererRef.current!.domElement);
        dragControl.activate();
        orbitControlRef.current.enabled = true;
    }

    //
    // function initAxesHelper() {
    //     const axesHelper = new AxesHelper(100);
    //     scene.add(axesHelper);
    // }

    function initLights() {
        directionalLight.position.set(0, 200, 0);
        scene.add(directionalLight);
    }

    function genRandomDestination(mesh: TempMesh) {
        const range = Math.ceil(Math.sqrt(state.nodesMap.size)) * 2;
        const xDirection = Math.random() < .5 ? -1 : 1;
        const yDirection = Math.random() < .5 ? -1 : 1;
        const zDirection = Math.random() < .5 ? -1 : 1;
        const x = Math.floor(Math.random() * range) * xDirection;
        const y = Math.floor(Math.random() * range) * yDirection;
        const z = Math.floor(Math.random() * range) * zDirection;
        return [x, y, z];
    }

    function genRandomSpeed() {
        return Number(movingSpeedFunc().toFixed(2));
    }

    function moveTowardDestination(mesh: TempMesh) {
        if (state.qMeshes.has(mesh.id)) {
            return;// 被隔离的不能移动
        }
        if (!mesh.destination) {
            mesh.destination = genRandomDestination(mesh);
            mesh.movingSpeed = genRandomSpeed();
        }
        const pos = mesh.position;
        const des = mesh.destination;

        if (Math.abs(pos.x - des[0]) <= 1 && Math.abs(pos.y - des[1]) <= 1 && Math.abs(pos.z - des[2]) <= 1) {
            mesh.destination = genRandomDestination(mesh);
            mesh.movingSpeed = genRandomSpeed();
        } else {
            const movingSpeed = mesh.movingSpeed * state.speedFactor;
            if (Math.abs(pos.x - des[0]) > 1) {
                if (pos.x < des[0]) {
                    pos.x += movingSpeed;
                } else if (pos.x > des[0]) {
                    pos.x -= movingSpeed;
                }
            }

            if (Math.abs(pos.y - des[1]) > 1) {
                if (pos.y < des[1]) {
                    pos.y += movingSpeed;
                } else if (pos.y > des[1]) {
                    pos.y -= movingSpeed;
                }
            }

            if (Math.abs(pos.z - des[2]) > 1) {
                if (pos.z < des[2]) {
                    pos.z += movingSpeed;
                } else if (pos.z > des[2]) {
                    pos.z -= movingSpeed;
                }
            }
        }
    }

    function moveItems() {
        for (const child of scene.children) {
            if (child instanceof Mesh) {
                const random = Math.random();
                if (random < movingPercentage / 100) {
                    const candidate = child as TempMesh;
                    moveTowardDestination(candidate);
                }
            }
        }
    }

    // 交叉感染
    function crossInfection() {
        const infectedCandidates: TempMesh[] = [];
        for (const sick of state.infMeshes.values()) {
            if (Math.random() < 0.3) {
                continue;// 传播者即使接触你也有一定概率不传播
            }
            if (state.qMeshes.has(sick.id) && Math.random() <= 0.95) {// 假定被隔离的传播能力很小，但也有5%的可能传播
                continue;
            }
            const pos1 = sick.position;
            for (const healthy of state.healthyMeshes.values()) {
                const testP = healthy.position;
                const distance = Math.sqrt(
                    Math.pow(testP.x - pos1.x, 2)
                    + Math.pow(testP.y - pos1.y, 2)
                    + Math.pow(testP.z - pos1.z, 2));
                if (distance <= 2 * sphereSize) {
                    console.log(healthy.id + '被感染');
                    infectedCandidates.push(healthy);
                }

            }
        }

        if (infectedCandidates.length > 0) {
            runInAction(() => {
                infectedCandidates.forEach(infectNode);
            });
        }
    }

    function render() {
        if (fpsStat) {
            fpsStat.update();
        }
        orbitControlRef.current.update();
        rendererRef.current!.render(scene, cameraRef.current);
        if (state.isPlaying) {
            if (state.won) {
                showMessage('你拯救了世界!');
                state.stopGame();
            } else if (state.lost) {
                showMessage('70%的个体被传播,调整参数,再来一次!');
                state.stopGame();
            } else {
                runInAction(() => {
                    crossInfection();
                    moveItems();
                    autoRotate();
                    quarantineNodes();
                    state.days += state.daysPerFrame;
                });
            }
        }
        requestAnimationId.current = requestAnimationFrame(render);
    }


    function addInitialData() {
        let count = 0;
        runInAction(() => {
            for (const n of stateRef.current.nodesMap.values()) {
                const mesh = addSphere(n);
                if (count < initInfectedCount) {
                    infectNode(mesh as TempMesh);
                } else {
                    state.healthyMeshes.set(mesh.id, mesh as TempMesh);
                }
                count++;
            }
        });
    }

    function infectNode(mesh: TempMesh) {
        state.infMeshes.set(mesh.id, mesh);
        state.healthyMeshes.delete(mesh.id);
        mesh.material = infMaterial;
    }

    // 整个界面自动旋转
    function autoRotate() {
        if (state.rotate) {
            const camera = cameraRef.current!;
            const rotSpeed = _get(props.threeConfigs, 'autoRotationSpeed', .01);
            camera.position.x = camera.position.x * Math.cos(rotSpeed) + camera.position.z * Math.sin(rotSpeed);
            camera.position.z = camera.position.z * Math.cos(rotSpeed) - camera.position.x * Math.sin(rotSpeed);
        }
    }

    async function start() {
        const firstMeshIndex = scene.children.findIndex(c => isSphere(c));
        const oldChildren = scene.children;
        if (firstMeshIndex !== -1) {
            scene.children = oldChildren.slice(0, firstMeshIndex);
        }
        if (requestAnimationId.current) {
            cancelAnimationFrame(requestAnimationId.current);
        }

        state.dispose();
        const data = await props.initialData();

        runInAction(() => {
            stateRef.current.initFrom(data.nodes, data.edges);
            fpsStat = initStats(props);
            addInitialData();
            state.startGame();
        });

        requestAnimationId.current = requestAnimationFrame(render);
    }

    React.useEffect(() => {
        setInited(true);
        initRendererAndCamera();
        // initAxesHelper();
        initLights();
        initControls();
        resize();
        window.addEventListener('resize', debouncedResize, false);
        rendererRef.current!.render(scene, cameraRef.current);
        const onLoaded = _get(props, 'events.onLoaded');
        if (onLoaded) {
            onLoaded(state);
        }

        function dispose() {
            window.removeEventListener('resize', debouncedResize, false);
            if (sceneRef.current) {
                for (const c of scene.children) {
                    c.parent = null;
                }
                scene.children = [];
                sceneRef.current.dispose();
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            disposeWebglResources();
            cancelAnimationFrame(requestAnimationId.current);
            removeExistingStats();
            const statsDom = document.getElementById('game-stats');
            if (statsDom) {
                document.body.removeChild(statsDom);
            }
            state.dispose();
        }

        return dispose;
    }, []);

    return (
        <div className='game-wrapper'>
            <div className='game-header'>
                <div className='operation-panels'>
                    <div className='operation-panel-left'>
                        <div className='operation-unit'>
                            <span className='operation-unit-title'>病床数</span>
                            <Slider
                                min={10} max={100} defaultValue={10} onAfterChange={(value: SliderValue) => {
                                setInitBeds(value as number);
                                state.stopGame();
                            }}/>
                        </div>
                        <div className='operation-unit'>
                            <Tooltip title={'问题是第几天后开始发现的'}>
                                <span className='operation-unit-title'>延迟(天）</span>
                            </Tooltip>
                            <Slider
                                min={10} max={30} defaultValue={20} onAfterChange={(value: SliderValue) => {
                                runInAction(() => {
                                    state.setUnwareDays(value as number);
                                    state.stopGame();
                                });
                            }}/>
                        </div>
                        <div className='operation-unit'>
                            <Tooltip title={'如果有1000个人，百分比是50，那么每个周期有1000*50%=500人在移动'}>
                                <span className='operation-unit-title'>移动人数百分比</span>
                            </Tooltip>
                            <Slider
                                min={0} max={99} defaultValue={5} onAfterChange={(value: SliderValue) => {
                                setMovingPercentage(value as number);
                                state.stopGame();
                            }}/>
                        </div>
                        <div className='operation-unit'>
                            <span className='operation-unit-title'>初始感染人数</span>
                            <Slider
                                min={0} max={200} defaultValue={10} onAfterChange={(value: SliderValue) => {
                                setInitInfectedCount(value as number);
                                state.stopGame();
                            }}/>
                        </div>
                    </div>
                    <div className='operation-panel-right'>
                        <div className='operation-unit'>
                            <span style={{color: 'red', marginLeft: 15}} className='operation-unit-title'>模拟速度</span>
                            <Radio.Group value={state.speed} onChange={(e: any) => {
                                state.setSpeed(e.target.value);
                            }}>
                                <Radio value={'slow'}>慢</Radio>
                                <Radio value={'normal'}>正常</Radio>
                            </Radio.Group>
                        </div>

                        <div className='operation-unit'>
                            <span style={{color: 'red'}} className='operation-unit-title'>旋转界面</span>
                            <Switch checked={state.rotate} onChange={state.setRotate.bind(state)}/>
                        </div>
                        <Button
                            type='primary'
                            style={{marginLeft: 5}}
                            onClick={() => {
                                if (state.isPlaying) {
                                    runInAction(() => {
                                        state.canContinue = true;
                                        state.isPlaying = false;
                                    });
                                } else {
                                    // 继续
                                    if (state.canContinue) {
                                        runInAction(() => {
                                            state.canContinue = false;
                                            state.isPlaying = true;
                                        });
                                    } else { // 重新开始
                                        start();
                                    }
                                }
                            }}>{state.isPlaying ? '暂停' : state.canContinue ? '继续' : '重新开始'}</Button>
                        {(state.canContinue || state.isPlaying) && <Button
                            style={{marginLeft: 5}}
                            onClick={() => {
                                state.stopGame();
                            }}
                        >停止</Button>}
                        <div onClick={() => {
                            state.setModalVisible(true);
                        }} style={{cursor: 'pointer', marginLeft: 20, color: 'red', fontWeight: 800}}>
                            关于
                        </div>
                    </div>
                </div>
            </div>
            <div className='canvas-wrapper'>
                <div ref={divRef} id={props.graphId} style={{width: '100%', height: '100%'}}>
                    {!inited && <CenteredSpin size={'large'}/>}
                </div>
                {<AboutModal state={state}/>}
            </div>
        </div>
    );
});
