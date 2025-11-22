# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - heading "FineDocChat" [level=1] [ref=e11]
      - paragraph [ref=e12]: Create your organization
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: Organization Name
        - generic [ref=e16]:
          - img [ref=e17]
          - textbox "Organization Name" [active] [ref=e20]:
            - /placeholder: Enter organization name
      - generic [ref=e21]:
        - generic [ref=e22]: Email
        - generic [ref=e23]:
          - img [ref=e24]
          - textbox "Email" [ref=e27]:
            - /placeholder: Enter your email
      - generic [ref=e28]:
        - generic [ref=e29]: Password
        - generic [ref=e30]:
          - img [ref=e31]
          - textbox "Password" [ref=e34]:
            - /placeholder: Enter your password
      - button "Create Organization" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
        - generic [ref=e39]: Create Organization
      - button "Already have an account? Sign in" [ref=e41] [cursor=pointer]
    - paragraph [ref=e43]:
      - strong [ref=e44]: "Note:"
      - text: Creating an organization will make you the administrator. You can invite team members later.
```