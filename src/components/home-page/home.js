import ko from 'knockout';
import homeTemplate from 'text!./home.html';
import GithubService from '../../services/github.service';

class HomeViewModel {
    constructor(route) {
        this.users = ko.observableArray([]);
    }
    
    loadUsers() {
        let users = GithubService.list();
        let scope = this;
        users.then(function(d) { scope.users(d) });
    }
}

export default { viewModel: HomeViewModel, template: homeTemplate };