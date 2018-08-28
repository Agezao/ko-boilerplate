import HttpHandler from './handlers/http.handler';

const list = (page) => {
  return HttpHandler.request('/users', 'GET', null);
}

const get = (id) => {
  return HttpHandler.request("/users/" + id, 'GET', null);
}

export default { list, get };