// Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string,
        hostElementId: string,
        insertAtStart: boolean,
        newElementId?: string
    ) {
        this.templateElement = document.getElementById(
            templateId
        )! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        const importedNode = document.importNode(
            this.templateElement.content,
            true
        );
        this.element = importedNode.firstElementChild as U;
        if (newElementId) {
            this.element.id = newElementId;
        }

        this.attach(insertAtStart);
    }

    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(
            insertAtBeginning ? 'afterbegin' : 'beforeend',
            this.element
        );
    }

    abstract configure(): void;

    abstract renderContent(): void;
}

class ProjectList extends Component<HTMLDivElement, HTMLElement> {
    assignedProjects: Project[];

    constructor(private type: 'active' | 'finished') {
        super('project-list', 'app', false, `${type}-projects`);

        this.assignedProjects = [];

        this.configure();
        this.renderContent();
    }

    configure() {
        projectState.addListener((projects: Project[]) => {
            this.assignedProjects = projects.filter(project => {
                if (this.type === 'active') return project.status === ProjectStatus.Active;
                if (this.type === 'finished') return project.status === ProjectStatus.Finished;
            });
            this.renderProjects();
        });
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLDListElement;
        listEl.innerHTML = '';
        for (const projectItem of this.assignedProjects) {
            const listItem = document.createElement('li');
            listItem.textContent = projectItem.title;
            listEl.appendChild(listItem);
        }
    }

    renderContent() {
        this.element.querySelector('ul')!.id = `${this.type}-projects-list`;
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS';
    }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        super('project-input', 'app', true, 'user-input');
        this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement;
        this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement;
        this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement;

        this.configure();
    }

    configure() {
        this.element.addEventListener('submit', this.submitHandler);
    }

    renderContent(): void {
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredPeople = this.peopleInputElement.value;

        const titleValidatable: IValidatable = {
            value: enteredTitle,
            required: true
        };

        const descriptionValidatable: IValidatable = {
            value: enteredDescription,
            required: true,
            minLength: 5
        };

        const peopleValidatable: IValidatable = {
            value: enteredPeople,
            required: true,
            min: 1,
            max: 5
        };

        if (!validate(titleValidatable) || !validate(descriptionValidatable) ||
            !validate(peopleValidatable)) {
            alert('Invalid input, please try again!');
            return;
        } else {
            return [enteredTitle, enteredDescription, +enteredPeople];
        }
    }

    private clearInputs() {
        this.titleInputElement.value = '';
        this.descriptionInputElement.value = '';
        this.peopleInputElement.value = '';
    }

    @Autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)) {
            const [title, desc, people] = userInput;
            projectState.addProject(title, desc, people);
            this.clearInputs();
        }
    }

}

export enum ProjectStatus { Active, Finished}

// Project Type
export class Project {
    constructor(public id: string,
                public title: string,
                public description: string,
                public people: number,
                public status: ProjectStatus) {

    }
}

type Listener<T> = (items: T[]) => void;

class State<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn);
    }
}

// Project State Management
class ProjectState extends State<Project>{
    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super();
    }

    static getInstance() {
        if (this.instance) {
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    addProject(title: string, description: string, numOfPeople: number) {
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            numOfPeople,
            ProjectStatus.Active
        );

        this.projects.push(newProject);

        for (const listener of this.listeners) {
            listener(this.projects.slice());
        }
    }
}

export const projectState = ProjectState.getInstance();

// Autobind decorator
export function Autobind(target: any, methodName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjustedDescriptor: PropertyDescriptor = {
        configurable: true,
        enumerable: false,
        get() {
            return originalMethod.bind(this);
        }
    };
    return adjustedDescriptor;
}

export interface IValidatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

export function validate(validatableInput: IValidatable) {
    let isValid = true;
    if (validatableInput.required) {
        isValid = isValid && (validatableInput.value.toString().trim().length !== 0);
    }
    if (validatableInput.minLength != null && typeof validatableInput.value === 'string') {
        isValid = isValid && (validatableInput.value.length >= validatableInput.minLength)
    }
    if (validatableInput.maxLength != null && typeof validatableInput.value === 'string') {
        isValid = isValid && (validatableInput.value.length <= validatableInput.maxLength)
    }
    if (validatableInput.min != null && typeof validatableInput.value === 'number') {
        isValid = isValid && (validatableInput.value >= validatableInput.min)
    }
    if (validatableInput.max != null && typeof validatableInput.value === 'number') {
        isValid = isValid && (validatableInput.value <= validatableInput.max)
    }
    return isValid;
}

const projectInput = new ProjectInput();
const activeProjectList = new ProjectList('active');
const finishedProjectList = new ProjectList('finished');