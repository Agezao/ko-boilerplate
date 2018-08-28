import ko from 'knockout';
import templateMarkup from 'text!./timer.html';
import style from 'text!./timer.css';

class Timer {
    constructor(params) {
        this.style = style;
        this.actualTime = ko.observable(new Date());
        this.time = ko.computed(function() {
            return this.actualTime().getTime();
        }, this);

        this.init();
    }

    init() {
        this.actualTime(new Date());
        setTimeout(function(scope){ 
            scope.init() 
        }, 500, this);
    }
    
    dispose() {}
}

export default { viewModel: Timer, template: templateMarkup };
