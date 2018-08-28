import ko from 'knockout';
import templateMarkup from 'text!./gh-list.html';

class GhList {
    constructor(params) {
        this.users = ko.observableArray([]);
        
        if(params && params.users)
            this.users = params.users;
    }
    
    dispose() {
        // This runs when the component is torn down. Put here any logic necessary to clean up,
        // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
    }
}

export default { viewModel: GhList, template: templateMarkup };
