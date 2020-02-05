import {ThreeNode} from './model/ThreeNode';
import {action, computed, observable, ObservableMap} from 'mobx';
import {ThreeEdge} from './model/ThreeEdge';
import {DAYS_PER_FRAME, TempMesh} from "./GameGraphUtils";

export class ThreeState {

    @observable rotate: boolean = false;
    @observable speed: string = 'normal';
    @observable canContinue: boolean = false;
    @observable isPlaying: boolean = false;
    // 游戏开始，但检测系统还未发现出现问题的潜伏天数
    @observable unwareDays: number = 20;
    @observable days: number = 0;

    @observable modalVisible = false;

    healthyMeshes: ObservableMap<number, TempMesh> = new ObservableMap<number, TempMesh>();
    infMeshes: ObservableMap<number, TempMesh> = new ObservableMap<number, TempMesh>();
    qMeshes: ObservableMap<number, TempMesh> = new ObservableMap<number, TempMesh>();

    // 这个应用无需动态调整节点和边，无需用ObservableMap
    nodesMap: Map<string, ThreeNode> = new Map<string, ThreeNode>();
    // 预留边
    edgesMap: Map<string, ThreeEdge> = new Map<string, ThreeEdge>();

    @action
    setUnwareDays(val: number) {
        this.unwareDays = val;
    }

    @action
    setModalVisible(val: boolean) {
        this.modalVisible = val;
    }

    @action
    setRotate(rotate: boolean) {
        this.rotate = rotate;
    }

    @action
    setDays(val: number) {
        this.days = val;
    }

    @action
    setSpeed(val: string) {
        this.speed = val;
    }

    @action
    setCanContinue(val: boolean) {
        this.canContinue = val;
    }

    @action
    setIsPlaying(val: boolean) {
        this.isPlaying = val;
    }

    @action
    stopGame() {
        this.isPlaying = false;
        this.canContinue = false;
    }

    @action
    startGame() {
        this.isPlaying = true;
        this.canContinue = false;
    }

    private addNodes(nodes: ThreeNode[]) {
        for (const n of nodes) {
            if (!this.nodesMap.has(n.id)) {
                this.nodesMap.set(n.id, n);
            }
        }
    }

    private addEdges(edges: ThreeEdge[]) {
        for (const e of edges) {
            if (!this.edgesMap.has(e.id)) {
                if (!this.nodesMap.has(e.fromId)) {
                    console.warn('边的起始节点' + e.fromId + '不在图中');
                    continue;
                }
                if (!this.nodesMap.has(e.toId)) {
                    console.warn('边的目标节点' + e.toId + '不在图中');
                    continue;
                }
                this.edgesMap.set(e.id, e);
            }
        }
    }

    initFrom(nodes: ThreeNode[], edges: ThreeEdge[]) {
        this.dispose();
        this.addNodes(nodes);
        this.addEdges(edges);
    }

    @action
    dispose() {
        this.edgesMap.clear();
        this.nodesMap.clear();
        this.healthyMeshes.clear();
        this.qMeshes.clear();
        this.infMeshes.clear();
        this.days = 0;
    }

    getNodeById(id: string) {
        return this.nodesMap.get(id);
    }

    getEdgeById(id: string) {
        return this.edgesMap.get(id);
    }

    @computed
    get daysPerFrame() {
        return DAYS_PER_FRAME * this.speedFactor;
    }

    @computed
    get speedFactor() {
        return this.speed === 'slow' ? .5 : 1;
    }

    @computed
    get stillUnaware() {
        return this.days < this.unwareDays;
    }

    @computed
    get status() {
        if (this.canContinue) {
            return '暂停';
        }
        if (this.isPlaying) {
            if (this.stillUnaware) {
                return '传播已开始，但未被察觉';
            }
            return '正在抑制传播';
        }
        if (this.won) {
            return '已胜利!';
        }
        if (this.lost) {
            return '不要气馁，再来一次!';
        }
        return '未开始';
    }

    @computed
    get won() {
        return this.infMeshes.size === 0;
    }

    @computed
    get lost() {
        return this.healthyMeshes.size / this.nodesMap.size <= 0.3;
    }
}
