# v1.4 Content Sorting

- Content categories are now created dynamically only when a media item is assigned to them, instead of displaying a fixed set of empty folders.
- 25 distinct AI categories, with multiple visual prompts per category.
- Distinct Photos/ and Videos/ directories are retained. Category names are based on detected content.
- Videos are not decoded for AI classification in this stability-oriented build. Filename hints categorize recognizable videos; others go into `Videos/Other Videos` rather than being incorrectly labeled selfies.
- Uncertain photo heuristic classifications go to `Photos/Other Photos` rather than guessing a category from colors alone.
- For accurate photo classification, enable AI sorting and download the model when prompted. Classification is probabilistic and should be reviewed before moving files.

Known limitation: No video scene understanding yet. Dynamic folder creation reflects the detected categories; it does not generate unrestricted natural-language names for every individual file.
