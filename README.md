# ddu-source-register

Register source for ddu.vim

This source collects current registers.

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddu.vim

https://github.com/Shougo/ddu.vim

### ddu-kind-word

https://github.com/Shougo/ddu-kind-word

## Configuration

```vim
" Use register source.
call ddu#start({'sources': [{'name': 'register'}]})
```
