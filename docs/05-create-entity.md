## Entity CRUD

### Overview

The entity pages follow a standard CRUD interaction pattern for project-scoped entity instances:

- **Create** a new entity instance from the search page by selecting an entity type and clicking **Create entity**.
- **Read** existing entity instances by searching and opening a result.
- **Update** an existing entity instance from the entity details page by clicking **Edit**, changing the fields, and clicking **Save**.
- **Delete** an existing entity instance from the entity details page by clicking **Delete** and confirming the deletion.

Entities represent structured data objects within a project, for example a person, biosample, visit, or other project-specific object.

---

### Selecting an entity type

The search and create forms first ask for the entity type. The available types are loaded from the selected project. The selected type determines which fields are shown in the create/edit form.

---

### Creating a new entity

To create a new entity instance:

1. Open the entity search page.
2. Select the entity type.
3. Click **Create entity**.
4. Fill out the fields generated from the type definition.
5. Click **Create**.

The form uses the entity type definition, so attribute names, labels, enum values, dates, numbers, and nested groups are rendered consistently with the same structure that is used for viewing and editing.

---

### Reading/searching entities

To read an existing entity:

1. Select the entity type.
2. Enter a search term.
3. Click **Search**.
4. Open one of the results to see the entity details.

---

### Updating an entity

To update an entity:

1. Open the entity details page.
2. Click **Edit**.
3. Change the fields.
4. Click **Save**.

Only the data fields from the active type definition are submitted back to the backend.

---

### Deleting an entity

To delete an entity:

1. Open the entity details page.
2. Click **Delete**.
3. Confirm the deletion in the confirmation dialog.

Deleting an entity uses the backend delete endpoint for the selected project and entity type.
