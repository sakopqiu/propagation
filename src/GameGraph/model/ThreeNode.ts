import {ThreeElement} from './ThreeElement';
import {Vector3} from 'three';

export class ThreeNode extends ThreeElement {
    position: Vector3 = new Vector3();

    public constructor(
        public id: string,
        public name: string,
        public label: string,
        public props: Record<string, any>) {
        super();
    }
}
