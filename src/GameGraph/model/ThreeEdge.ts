import {ThreeElement} from './ThreeElement';

export class ThreeEdge extends ThreeElement {
    public constructor(
        public id: string,
        public label: string,
        public fromId: string,
        public toId: string,
        public props: Record<string, any>,
    ) {
        super();
    }
}
