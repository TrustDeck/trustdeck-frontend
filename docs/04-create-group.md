## Create Group

### Overview

Groups are used to structure and organize entities and pseudonyms within a project. Each group defines rules for how pseudonyms are generated and managed.

When a new project is created, a default root group is automatically created. This group has the same name as the project.

---

### Default Group

- A default group is created automatically when the project is created  
- The group name is identical to the project name  

---

### Creating a New Group

To create a new group:

1. Navigate to the Group Management page within a project  
2. Click on **New Group**  
3. Fill out the required information in the form  

---

### Group Configuration Fields

When creating a group, the following fields must be configured:

- **Group name** – Name of the group  
- **Parent group** – The group under which this group will be created  
- **Prefix** – Prefix used for generated pseudonyms  
- **Pseudonym length** – Total length of the pseudonym  
- **Start date** – Start of validity period  
- **End date** – End of validity period  
- **Description** – Optional description of the group  
- **Algorithm** – Algorithm used for pseudonym generation  
- **Alphabet** – Character set used for pseudonyms  
- **Max. number of pseudonyms** – Maximum number of pseudonyms allowed in this group  
- **Padding character** – Character used for padding pseudonyms  
- **Multiple pseudonyms allowed** – Whether multiple pseudonyms can be assigned to the same value  
- **Check digit required** – Whether a check digit is included in generated pseudonyms  

---

### Inherit from Parent

For some configuration fields, you can select “Inherit from parent”.

If enabled, the value for that field will be automatically inherited from the selected parent group instead of being set manually.

---

### Pseudonym Preview

At the top of the group creation panel, a live preview is displayed.  
This preview shows how a pseudonym would look based on the currently selected configuration values.

It updates automatically as you change the form fields.

---

### After Creation

Once the group is created:

- It appears in the group hierarchy under the selected parent group  
- It can be used to generate and manage pseudonyms  
- Its configuration determines how pseudonyms are created within it  