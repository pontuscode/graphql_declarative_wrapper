# Prerequisites to use this tool

In order to use this tool, the following four things are needed: 

1. A schema file you want to wrap (or a _remote schema_ hereafter)
2. Knowledge of how the remote schema is structured
3. A server where the remote schema is hosted
4. A wrapper schema definition file (the _wsDef_ file hereafter)

The first three points should be self-explanatory if you are familiar with GraphQL and the GraphQL Schema Definition Language. 

The wsDef file is the input to the tool. The wsDef file supports five different GraphQL directives. Information about these directives can be found [here](directives.md).

# Todo

## Important

### Remove all unnecessary files and clean up the repository (Pontus)

### Add explanations for how to use the tool (Pontus + Markus)

### Remove the extractNested stuff from listQuery when generating. Also remove the array thing from writeResolverWithoutArgs. (Markus)

### Add additional checks for concatenation in resolver functions (Markus)

### Document functions that are not self-explanatory (preferably using docstrings like some functions already have) (Markus + Pontus)

## Not as important

### Remove wrappedTypes (Markus)

### Add checks before overwriting files during schema generation (check if file exists) (Markus/Pontus)

### Remove redundant parameters in concatenate resolver functions (Markus) (done?)

## Done

### Fix path traversal so it aligns with Section 3.2 (Pontus)

### Fix includeAllFields validation so it meets new requirements. 

### Add proper error messages to everything, both validation and generation errors - done

### Add generation steps for object and interface types that have enabled includeAllFields - done

### Fix traversePath in the validation algorithm - done

### Implement/finish wrap validation for field definitions - done

### Add functionality for concatenate on types wrapping an interface (wrappedFaculty for example) - done

### Change concatenate validation. If object type is not wrapped, then return false - done

### Revamp concatenate validation. - done

### Add typesImplementingInterface to resolver without arguments - done

### Implement/finish wrap validation conditions 3, 4, 6, 7 - done

### Change concatenate resolver generation, the if-else part should be present for simple strings (not only for delegated fields) - done


