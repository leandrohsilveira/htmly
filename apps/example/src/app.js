import {
    component,
    element,
    text,
    event,
    $if,
    $for,
    fragment
} from '@htmly/core/renderer';
import controller from './app.component.js';
export default component(controller, function () {
    return fragment(element('h1', {}, text(() =>
        this.title)), element('button', {
        type: 'button',
        onclick: event(e => this.increment(e))
    }, text('Increment')), element('input', {
        type: 'number',
        name: 'count',
        id: 'count',
        value: () =>
            (this.count()),
        oninput: event(this.handleInput)
    }), element('button', {
        type: 'button',
        onclick: event(e => this.decrement(e))
    }, text('Decrement')), element('br'), text('Count is '), text(() =>
        ((this.count()) % 2 === 0 ? 'even' : 'odd')), element('br'), $if({
        ifs: [
            [
                () =>
                    (this.count()) > 100,
                element('strong', {}, text('WOW!'))
            ],
            [
                () =>
                    (this.count()) > 20,
                text('Okay\n')
            ]
        ],
        otherwise: text('Meh\n')
    }), element('br'), element('ul', {}, $for({
        items: () =>
            (this.items()),
        trackBy: item =>
            (item())
    }, item =>
        (element('li', {}, element('strong', {}, text(() =>
            (item()))))))), element('br'), element('button', {
        type: 'button',
        onclick: event(this.toggleSort)
    }, text('Toggle sort direction')));
});