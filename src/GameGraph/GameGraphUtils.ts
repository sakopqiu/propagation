import {
    AxesHelper,
    Camera,
    Geometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    Object3D,
    Raycaster,
    SphereGeometry,
    Texture,
    TextureLoader,
    Vector3,
} from 'three';

import Stats from 'three/examples/jsm/libs/stats.module';
import {ThreeState} from './ThreeState';
import _get from 'lodash/get';
import {ThreeEdge} from "./model/ThreeEdge";
import {ThreeNode} from "./model/ThreeNode";

export const MAT_MANAGER = new Map<string, AllowedMaterial | LineBasicMaterial>();
export const GEO_MANAGER = new Map<string, Geometry>();
export const textureLoader = new TextureLoader();
export type AllowedMaterial = MeshBasicMaterial | MeshPhongMaterial | MeshStandardMaterial | MeshLambertMaterial;

export interface GameGraphProps {
    graphId: string;
    level1Name: string;
    level2Name: string;
    threeConfigs?: {
        showStats?: boolean; // 是否在左上角显示fps信息
        renderer?: {
            backgroundColor?: string | number;
            antialias?: boolean;
        }
        autoRotationSpeed?: number; // 进入界面时，自动旋转的时间
        animation?: {
            addLineDuration?: number; // 点击一个mesh，和它相关的线段伸缩出来的时间
        },
        camera?: {
            fov?: number, // PerspectiveCamera的frustum of view
            near?: number, // 从距离照相机的near开始可见
            far?: number, // 至多到距离照相机的far为止可见
            position?: Vector3, // 照相机的初始位置
        }
        mesh?: {
            size?: number, // 目前mesh都是圆球，这里是圆球的半径
            segments?: number, // segments越高，圆球绘制的越圆，但是性能会更差
        }
        material?: {
            materialType?: AllowedMaterial; // mesh的材质
            color?: string | number; // mesh材质的默认颜色
            infectedColor?: string | number; // 被感染时的颜色
            quarantineColor?: string | number; // 被隔离治疗的颜色
            transparent?: boolean; // mesh是否为透明，默认为true
            opacity?: number; // mesh默认的不可见度
            wireframe?: boolean; // 是否显示mesh的线框
        }
    };
    events?: {
        onLoaded?: (state: ThreeState) => any;// 初始化完后callback
    }
    initialData: () => Promise<{ nodes: ThreeNode[], edges: ThreeEdge[] }>;
}

// 根据给与的参数返回一个已经存在的材质，不存在则重新创建一个
export function getCachedMaterial(info: AllowedMaterial) {
    let lookUpKey = `${info.constructor.name}=>${info.transparent}-${info.opacity}`;
    if (info.color) {
        lookUpKey += '-c=' + info.color.getHex();
    }
    if (info.map) {
        lookUpKey += '-m=' + info.map.name;
    }
    if (info.wireframe) {
        lookUpKey += -'wf=' + String(info.wireframe);
    }

    if (MAT_MANAGER.has(lookUpKey)) {
        return MAT_MANAGER.get(lookUpKey)!;
    }

    info.name = lookUpKey;
    MAT_MANAGER.set(lookUpKey, info);
    return MAT_MANAGER.get(lookUpKey)!;
}

export function getCachedGeometry(info: Geometry) {
    let lookUpKey = `${info.constructor.name}=>`;
    if (info instanceof SphereGeometry) {
        const paramsStr = Object.keys(info.parameters).map((key) => {
            return `${key}:${info.parameters[key]}`;
        }).join(',');

        lookUpKey += `params=${paramsStr}`;
    }
    if (GEO_MANAGER.has(lookUpKey)) {
        return GEO_MANAGER.get(lookUpKey)!;
    }
    info.name = lookUpKey;
    GEO_MANAGER.set(lookUpKey, info);
    return GEO_MANAGER.get(lookUpKey)!;
}

export function webglCoord(e: MouseEvent, boundingBox: ClientRect) {
    const x = e.clientX - boundingBox.left;
    const y = e.clientY - boundingBox.top;
    return {
        x: (x / boundingBox.width) * 2 - 1,
        y: -(y / boundingBox.height) * 2 + 1,
        z: .5,
    };
}

export function tryToIntersect(e: MouseEvent, camera: Camera, boundingBox: ClientRect, colliable: Object3D[]) {
    const coord = webglCoord(e, boundingBox);
    const vectorInShader = new Vector3(
        coord.x,
        coord.y,
        coord.z,
    );
    const vectorInThree = vectorInShader.unproject(camera);
    const rayCaster = new Raycaster(camera.position, vectorInThree.sub(camera.position).normalize());
    return rayCaster.intersectObjects(colliable);
}

// 需要往原生Mesh上存取一些临时属性
export interface TempMesh extends Mesh {
    faded: boolean;
    destination: number[];
    movingSpeed: number; // 服从正态分布的一个随机速度，切换一次终点更换一次
    quarantineDays: number; // 患者患病天数
}

export interface TempLineMesh extends Line {
    fromId: string;
    toId: string;
}

export function firstInterception(e: MouseEvent, camera: Camera, boundingBox: ClientRect, colliable: Object3D[]) {
    const intersections = tryToIntersect(e, camera, boundingBox, colliable);
    const firstEligibleInterception = intersections.find(ele => isSphere(ele.object));
    if (firstEligibleInterception) {
        return firstEligibleInterception.object as TempMesh;
    }
    return null;
}

export const TEXT_TEXTURE_MANAGER = new Map<string, Texture>();

export function textAsTexture(fillColor: string, text: string) {
    if (TEXT_TEXTURE_MANAGER.has(text)) {
        return TEXT_TEXTURE_MANAGER.get(text)!;
    }
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext('2d')!;
    context.fillStyle = fillColor;
    context.fillRect(0, 0, 128, 128);
    context.font = '22px serif';
    context.fillStyle = 'blue';
    context.fillText(text, 30, 70);
    const texture = new Texture(textureCanvas);
    texture.needsUpdate = true;
    texture.name = text; // material的缓存管理器中会使用texture的name属性作为lookupKey组成的一部分
    TEXT_TEXTURE_MANAGER.set(text, texture);
    return texture;
}

export const DEFAULT_MATERIAL_COLOR = '#ddaa4d';
export const DEFAULT_QUARANTINE_COLOR = '#2c2da8';
export const DEFAULT_INFECTED_MATERIAL_COLOR = '#ff0000';
export const DAYS_PER_FRAME = 0.1; // 一次frame走0.1天

const DEFAULT_MATERIAL_KEY = 'DEFAULT_MATERIAL_KEY';
const DEFAULT_LINE_MATERIAL_KEY = 'DEFAULT_LINE_MATERIAL_KEY';
const DEFAULT_FADED_MATERIAL_KEY = 'DEFAULT_FADED_MATERIAL_KEY';
const INFECTED_MATERIAL = 'INFECTED_MATERIAL';
const QUARANTINE_MATERIAL = 'QUARANTINE_MATERIAL';
const OPACITY = .6;
const FADED_OPACITY = .2;

export function loadTexture(props: GameGraphProps) {
    return new Promise((resolve) => {
        textureLoader.load('/bubble.gif', (texture: Texture) => {
            const defaultMat = defaultMaterial(props);
            (defaultMat as any).map = texture;
            resolve();
        }, () => {
        }, (err) => {
            console.error('Failed to load texture bubble.gif');
            resolve();
        });
    });
}

export function defaultMaterial(props: GameGraphProps) {
    if (MAT_MANAGER.has(DEFAULT_MATERIAL_KEY)) {
        return MAT_MANAGER.get(DEFAULT_MATERIAL_KEY)!;
    }

    const MatType = _get(props.threeConfigs, 'material.materialType', MeshBasicMaterial);
    const matColor = _get(props.threeConfigs, 'material.color', DEFAULT_MATERIAL_COLOR);
    const matTransparent = _get(props.threeConfigs, 'material.transparent', true);
    const matOpacity = _get(props.threeConfigs, 'material.opacity', OPACITY);
    const matWireFrame = _get(props.threeConfigs, 'material.wireframe', false);
    const mat = new MatType({
        color: matColor,
        transparent: matTransparent,
        opacity: matOpacity,
        wireframe: matWireFrame,
    });
    MAT_MANAGER.set(DEFAULT_MATERIAL_KEY, mat);
    return mat as AllowedMaterial;
}

export function disposeWebglResources() {
    disposeGeometries();
    disposeMaterials();
    disposeTextures();
}

export function disposeTextures() {
    for (const texture of TEXT_TEXTURE_MANAGER.values()) {
        texture.dispose();
    }
    TEXT_TEXTURE_MANAGER.clear();
}

export function disposeMaterials() {
    for (const mat of MAT_MANAGER.values()) {
        mat.dispose();
    }
    MAT_MANAGER.clear();
}

export function disposeGeometries() {
    for (const geom of GEO_MANAGER.values()) {
        geom.dispose();
    }
    GEO_MANAGER.clear();
}

const DEFAULT_GEOM_KEY = 'DEFAULT_GEOM_KEY';

export function defaultGeometry(props: GameGraphProps) {
    if (GEO_MANAGER.has(DEFAULT_GEOM_KEY)) {
        return GEO_MANAGER.get(DEFAULT_GEOM_KEY)!;
    }
    const sphereSize = _get(props.threeConfigs, 'mesh.size', 1);
    const segments = _get(props.threeConfigs, 'mesh.segments', 24);
    const defaultGeometry = new SphereGeometry(sphereSize, segments, segments, 0, Math.PI * 2, 0, Math.PI);
    GEO_MANAGER.set(DEFAULT_GEOM_KEY, defaultGeometry);
    return defaultGeometry;
}

export function defaultLineMaterial(props: GameGraphProps) {
    if (MAT_MANAGER.has(DEFAULT_LINE_MATERIAL_KEY)) {
        return MAT_MANAGER.get(DEFAULT_LINE_MATERIAL_KEY)! as LineBasicMaterial;
    }
    const lineColor = _get(props.threeConfigs, 'lineMaterial.color', '#ff0000');
    const lineMaterial = new LineBasicMaterial({color: lineColor});
    MAT_MANAGER.set(DEFAULT_LINE_MATERIAL_KEY, lineMaterial);
    return lineMaterial as LineBasicMaterial;
}

export function fadedMaterial(props: GameGraphProps) {
    if (MAT_MANAGER.has(DEFAULT_FADED_MATERIAL_KEY)) {
        return MAT_MANAGER.get(DEFAULT_FADED_MATERIAL_KEY)!;
    }
    const newMaterial = defaultMaterial(props).clone();
    const fadedOpacity = _get(props.threeConfigs, 'material.fadedOpacity', FADED_OPACITY);
    newMaterial.opacity = fadedOpacity;
    MAT_MANAGER.set(DEFAULT_FADED_MATERIAL_KEY, newMaterial);
    return newMaterial as AllowedMaterial;
}

export function infectedMaterial(props: GameGraphProps) {
    if (MAT_MANAGER.has(INFECTED_MATERIAL)) {
        return MAT_MANAGER.get(INFECTED_MATERIAL)!;
    }
    const newMaterial = defaultMaterial(props).clone();
    let color = _get(props.threeConfigs, 'material.infectedColor', DEFAULT_INFECTED_MATERIAL_COLOR);
    if (color[0] !== '#') {
        color = '#' + color;
    }
    newMaterial.color.setStyle(color);
    MAT_MANAGER.set(INFECTED_MATERIAL, newMaterial);
    return newMaterial as AllowedMaterial;
}

export function quaratineMaterial(props: GameGraphProps) {
    if (MAT_MANAGER.has(QUARANTINE_MATERIAL)) {
        return MAT_MANAGER.get(QUARANTINE_MATERIAL)!;
    }
    const newMaterial = defaultMaterial(props).clone();
    let color = _get(props.threeConfigs, 'material.quarantineColor', DEFAULT_QUARANTINE_COLOR);
    if (color[0] !== '#') {
        color = '#' + color;
    }
    newMaterial.color.setStyle(color);
    MAT_MANAGER.set(QUARANTINE_MATERIAL, newMaterial);
    return newMaterial as AllowedMaterial;
}

export function isSphere(child: Object3D): child is TempMesh {
    return child instanceof Mesh && child.geometry instanceof SphereGeometry;
}

export function isLine(child: Object3D): child is TempLineMesh {
    return child instanceof Line && !(child instanceof AxesHelper);
}

export function removeExistingStats() {
    const existingStats = document.getElementById('game-stats');
    if (existingStats) {
        document.body.removeChild(existingStats)
    }
}

export function initStats(props: GameGraphProps) {
    removeExistingStats();
    if (_get(props.threeConfigs, 'showStats')) {
        const stats = new Stats();
        stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        stats.dom.id = 'game-stats';
        stats.dom.style.cssText = "position: fixed; bottom: 10px; left: 10px; cursor: pointer; opacity: 0.9; z-index: 10000;";
        document.body.appendChild(stats.dom);
        return stats;
    }
    return null;
}

// 查看当前geometry，material的数量
export function printResourceStats() {
    console.log('当前材质数量', MAT_MANAGER.size);
    console.log('当前Geom数量', GEO_MANAGER.size);
    console.log('当前Texture数量', TEXT_TEXTURE_MANAGER.size);
}

(window as any).printResourceStats = printResourceStats;
