# Menu Spreadsheet Guide 🌮

This guide explains what each column in the Google Sheet does and how to fill it out correctly to build your dynamic menu.

---

## `Category`
* **What it does:** Creates a large headline for a section (e.g., "Tacos", "Mariscos", "Antojos").
* **How to use:** All items with the *same* category name will be grouped together under that headline.
* **Special Case:** If you **leave this field blank**, the item will automatically be placed in a default category named "Menu" with all other uncategorized items.

---

## `Item`
* **What it does:** This is the name of the food item (e.g., "Asada", "Vampiro", "Quesabirrias").
* **How to use:** This field is **required** for every row you want to display.

---

## `Description`
* **What it does:** Provides the descriptive text for an item or a group.
* **How to use:**
    * **For Grouped Items:** Fill this out on the **first item** of a group (e.g., the "Asada" row for "Street Tacos"). This description will be used for the *entire group card* (e.g., "All tacos served with...").
    * **For Individual Items:** This text appears on the item's own card (e.g., "Toasted tortilla with cheese, beans...").

---

## `Price`
* **What it does:** Sets the price for the item.
* **How to use:** Just enter the number (e.g., `4` or `15.50`). The dollar sign `$` is added automatically.

---

## `GroupingName`
* **What it does:** This is the key field that creates a "Group Card" and puts multiple items inside it.
* **How to use:**
    * **To Group Items:** Put the **exact same name** here for all items you want to list inside one card. (e.g., name this "Street Tacos" for your Asada, Pastor, and Pollo taco rows).
    * **For Individual Items:** Leave this field **BLANK**. This will create a separate card for this item (e.g., for "Vampiro").

---

## `Image`
* **What it does:** Sets the image for an **individual item card**.
* **How to use:** Use this **only when `GroupingName` is BLANK**. Paste the full image URL here (e.g., the picture for "Vampiro").

---

## `GroupImage`
* **What it does:** Sets the main image for a **group card**.
* **How to use:** Use this **only for grouped items**. On the **first item** of your group (e.g., the "Asada" row), paste the full image URL you want to represent the *entire group* (e.g., the main "Street Tacos" picture).

---

## `Special`
* **What it does:** Adds a `★` star icon to a card.
* **How to use:** This works **only for individual items** (when `GroupingName` is blank). Type `yes` in this column to make the star appear.
* **Note:** This is *ignored* for items inside a group.

---

## `Badge`
* **What itD does:** Adds a small text badge (e.Type "New!", "Spicy", "Popular", etc.).
* **How to use:** This works for **both** types of items:
    * **For Individual Items:** Adds the badge to the main card.
    * **For Grouped Items:** Adds the badge next to the *specific item's name* inside the group list (e.g., "Tripa [Spicy]").