class Model {
  constructor() {
    this.contacts = [];
  }

  getContacts() {
    return this.contacts;
  }

  formatTag(contactObj) {
    if (contactObj.tags !== null) {
      contactObj.tags = contactObj.tags.split(",").map(tag => tag.trim());
    }
    return contactObj;
  }

  formatTags() {
    this.contacts = this.contacts.map(this.formatTag);
  }

  async fetchContacts() {
    try {
      const response = await fetch("http://localhost:3000/api/contacts");
      const data = await response.json();
      this.contacts = data;
      return data;
    } catch (error) {
        throw error;    
    }
  }

  async addContact(data) {
    try {
      await fetch("http://localhost:3000/api/contacts/", 
        {
          method: "POST", 
          headers: {
            'Content-Type': 'application/json'
          },
          body: data,
        });
    } catch (error) {
      throw error;
    }
  }

  getUniqueTags() {
    let unique = [];
    this.contacts.forEach(contactObj => {
      if (contactObj.tags !== null) {
        contactObj.tags.forEach(tag => {
          if (!unique.includes(tag)) {
            unique.push(tag);
          }
        });
      }
    });

    return unique;
  }

  async deleteContact(id) {
    try {
      let response = await fetch(`http://localhost:3000/api/contacts/${id}`, {
        method: "DELETE", 
      });
      await response.text(); // see link for why we do this: https://stackoverflow.com/questions/57477805/why-do-i-get-fetch-failed-loading-when-it-actually-worked 
    } catch (error) {
      throw error;
    }
  }

  getContact(id) {
    return this.contacts.filter(contact => contact.id === id)[0];
  }

  async editContact(data, id) {
    try {
      await fetch(`http://localhost:3000/api/contacts/${id}`, {
        method: "PUT", 
        headers: {
          'Content-Type': 'application/json'
        },
        body: data,
      });
    } catch (error) {
      throw error;
    }
  }

  filterContactsByTag(tag) {
    if (tag === 'All Tags') {
      return this.getContacts();
    }

    let filteredContacts = [];
    this.getContacts().forEach(contact => {
      if (contact.tags !== null && contact.tags.includes(tag)) {
        filteredContacts.push(contact);
      }
    });

    return filteredContacts;
  }

  filterContactsBySearch(str) {
    str = str.trim().toLowerCase();
    if (str === "") return this.getContacts();

    let filteredContacts = [];
    this.getContacts().forEach(contact => {
      let contactString = contact.full_name.toLowerCase();
      if (contactString.includes(str)) {
        filteredContacts.push(contact);
      }
    });

    return filteredContacts;
  }
}

class View {
  constructor() {
    this.compileTemplates();
    this.contactContainer = document.getElementById('contact-list');
    this.addContactContainer = document.getElementById('add-contact-container');
    this.addContactForm = document.getElementById('add-contact-form');
    this.submitForm = document.getElementById('form-submit');
    this.cancelForm = document.getElementById('form-cancel');
    this.tagForm = document.getElementById('tagList');
    this.editContactContainer = document.getElementById('edit-contact-container')
  }

  compileTemplates() {
    Handlebars.registerPartial('partial', document.getElementById('partial').innerHTML);
    this.template = Handlebars.compile(document.getElementById('template').innerHTML);
  }

  renderContacts(json) {
    if (json.length === 0) {
      this.contactContainer.innerHTML = '<h1 id="no_contacts">You have no contacts.</h1>';
    } else {
      this.contactContainer.innerHTML = this.template({contacts: json});
    }
  }

  show(node) {
    node.classList.remove('hidden');
  }

  hide(node) {
    node.classList.add('hidden');
  }

  resetForm() {
    this.addContactForm.reset();
    this.addContactForm.querySelector('h1').textContent = "Create Contact";
    this.addContactForm.setAttribute('data-edit', 'false');
    this.addContactForm.removeAttribute('data-id');
  }

  renderTags(uniqueTags) {
    let selectNode = this.tagForm.children[0];
    while (selectNode.children.length !== 1) {
      selectNode.children[1].remove();
    }

    uniqueTags.forEach(tag => {
      let option = document.createElement('option'); 
      option.setAttribute('value', tag);
      option.textContent = tag;
      selectNode.appendChild(option);
    });
  }

  editContactForm(data) {
    this.addContactForm.querySelector('h1').textContent = "Edit Content";
    this.addContactForm.full_name.value = data.full_name;
    this.addContactForm.email.value = data.email;
    this.addContactForm.phone_number.value = data.phone_number;

    if (data.tags === null) {
      this.addContactForm.tags.value = '';
    } else {
      this.addContactForm.tags.value = data.tags.join(", ");
    }
  }

  hideErrorMessages() {
    document.querySelectorAll('.error-message').forEach(divNode => divNode.classList.add('visibility-hidden'))
  }
}

class Controller {
  constructor(model, view) {
    this.model = model; 
    this.view = view;
    this.loadPage();
    this.initiateListeners();
  } 

  async loadPage() {
    await this.model.fetchContacts();
    this.model.formatTags();
    this.view.renderContacts(this.model.getContacts());

    let uniqueTags = this.model.getUniqueTags();
    this.view.renderTags(uniqueTags);

    this.view.hide(document.getElementById("add-contact-container"));
    this.view.show(document.getElementById('contact-list'));
  }

  initiateListeners() {
    document.getElementById("add-contact-link").addEventListener('click', this.handleClickAddForm.bind(this));
    document.getElementById("add-contact-form").addEventListener('submit', this.handleSubmit.bind(this));
    document.getElementById("form-cancel").addEventListener('click', this.handleCancel.bind(this));
    document.getElementById("contact-list").addEventListener('click', this.handleClickContactList.bind(this));
    document.getElementById("select-options").addEventListener('change', this.handleSelectTags.bind(this));
    document.querySelector('.nav-anchor[data-type="show-all"]').addEventListener('click', this.handleShowAllContactLink.bind(this));
    // document.getElementById('search').addEventListener('input', this.handleSearch.bind(this));
    document.getElementById('search').addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
  }

  handleSearch(event) {
    event.preventDefault();
    let str = event.target.value; 
    let filteredContacts =  this.model.filterContactsBySearch(str)
    this.view.renderContacts(filteredContacts);
  }

  debounce(func, delay) {
    let timeout;
    return (...args) => {
      if (timeout) { clearTimeout(timeout) }
      timeout = setTimeout(() => func.apply(null, args), delay);
    };
  };

  handleShowAllContactLink(event) {
    event.preventDefault();
    let allContacts = this.model.getContacts();
    this.view.renderContacts(allContacts);
  }

  handleSelectTags(event) {
    event.preventDefault();
    let tagValue = event.target.value; 
    let filteredContacts = this.model.filterContactsByTag(tagValue);
    this.view.renderContacts(filteredContacts);
  }

  handleSelectLinks(event) {
    event.preventDefault();
    let tagValue = event.target.textContent;
    let filteredContacts = this.model.filterContactsByTag(tagValue);
    this.view.renderContacts(filteredContacts);
  }

  async handleClickContactList(event) {
    if (event.target.className === 'delete-btn') {
      this.handleDeleteButton(event) // calling "await" is optional here... nothing sync afterwards.
    } else if (event.target.className === 'edit-btn') {
      this.handleEditButton(event);
    } else if (event.target.tagName === 'A') {
      this.handleSelectLinks(event);
    }
  }

  async handleDeleteButton(event) {
    event.preventDefault();
    let id = +event.target.getAttribute('data-id');
    await this.model.deleteContact(id);
    await this.loadPage();
  }

  async handleEditButton(event) {
    let id = +event.target.getAttribute('data-id');
    let form = document.getElementById('add-contact-form');
    form.setAttribute('data-edit', 'true');
    form.setAttribute('data-id', id);

    let contactData = this.model.getContact(id); 
    this.view.editContactForm(contactData);

    this.view.show(this.view.addContactContainer);
    this.view.hide(this.view.contactContainer);
  }

  handleClickAddForm(event) {
    event.preventDefault();
    this.view.show(this.view.addContactContainer);
    this.view.hide(this.view.contactContainer);
  }

  async handleSubmit(event) {
    event.preventDefault();
    let formContainer = document.getElementById('add-contact-container')
    let form = document.getElementById('add-contact-form');
    let id = +form.getAttribute('data-id');
    let editForm = form.getAttribute('data-edit');
    this.view.hideErrorMessages();

    let name = document.getElementById('full_name').value.trim();
    let email = document.getElementById('email').value.trim();
    let number = document.getElementById('phone_number').value.trim();

    // Valid form
    if (this.isValidForm(name, email, number)) {
      this.view.hide(formContainer);
      let formData = new FormData(form);
      let object = {};
      formData.forEach((value, key) => object[key] = value);
      let data = JSON.stringify(object);
  
      if (editForm === "false") {
        await this.model.addContact(data); 
      } else if (editForm === "true") {
        await this.model.editContact(data, id); 
      }
      await this.loadPage();
      this.view.resetForm();

    // Not valid form
    } else {
      if (!this.isValidName(name)) {
        document.querySelector('.error-message[data-error="name"]')
          .classList
          .remove('visibility-hidden');
      }
      if (!this.isValidEmail(email)) {
        document.querySelector('.error-message[data-error="email"]')
          .classList
          .remove('visibility-hidden');
      }
      if (!this.isValidNumber(number)) {
        document.querySelector('.error-message[data-error="phone"]')
          .classList
          .remove('visibility-hidden');
      }
    }
  }

  isValidForm(name, email, number) {
    return this.isValidName(name) && this.isValidEmail(email) && this.isValidNumber(number);
  }

  isValidName(name) {
    return /^[a-zA-Z]+ ?[a-zA-Z]+$/.test(name); 
  }

  isValidEmail(email) {
    return /^\S+@\S+\.[0-9a-zA-Z]+$/.test(email);  
  }

  isValidNumber(number) {
    return /^\d{3}-?\d{3}-?\d{4}$/.test(number); // dash is optional
  }

  handleCancel(event) {
    event.preventDefault();
    this.view.hide(this.view.addContactContainer);
    this.view.show(this.view.contactContainer);
    this.view.resetForm();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let controller = new Controller(new Model(), new View());
});