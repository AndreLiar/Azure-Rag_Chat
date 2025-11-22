# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - heading "FineDocChat" [level=1] [ref=e20]
      - paragraph [ref=e21]: Create your organization
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: Organization Name
        - generic [ref=e25]:
          - img [ref=e26]
          - textbox "Organization Name" [active] [ref=e38]:
            - /placeholder: Enter organization name
      - generic [ref=e39]:
        - generic [ref=e40]: Email
        - generic [ref=e41]:
          - img [ref=e42]
          - textbox "Email" [ref=e45]:
            - /placeholder: Enter your email
      - generic [ref=e46]:
        - generic [ref=e47]: Password
        - generic [ref=e48]:
          - img [ref=e49]
          - textbox "Password" [ref=e52]:
            - /placeholder: Enter your password
      - button "Create Organization" [ref=e53] [cursor=pointer]:
        - img [ref=e54]
        - generic [ref=e59]: Create Organization
      - button "Already have an account? Sign in" [ref=e61] [cursor=pointer]
    - paragraph [ref=e63]:
      - strong [ref=e64]: "Note:"
      - text: Creating an organization will make you the administrator. You can invite team members later.
```