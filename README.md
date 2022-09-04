# Todo

## Important

### Remove all unnecessary files and clean up the repository

### Add explanations for how to use the tool 

### Remove the extractNested stuff from listQuery when generating. Also remove the array thing from writeResolverWithoutArgs. 

### Fix includeAllFields validation so it meets new requirements. 

### Add additional checks for concatenation in resolver functions

### Fix path traversal so it aligns with Section 3.2

## Not as important

### Remove wrappedTypes 

### Add checks before overwriting files during schema generation (check if file exists)

### Remove redundant parameters in concatenate resolver functions

## Done

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


