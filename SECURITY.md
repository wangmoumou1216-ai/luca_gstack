# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | Yes                |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report vulnerabilities by emailing **<wangzixuan0828@gmail.com>**. Include the following in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions and components
- Impact assessment (severity, potential for exploitation)
- Any suggested fixes or mitigations, if available

## Response Timeline

- **48 hours** -- Initial acknowledgment of your report
- **7 days** -- Preliminary assessment and severity classification
- **30 days** -- Target for a fix or mitigation to be released

We will keep you informed of progress throughout the process.

## Safe Harbor

We consider security research conducted in good faith to be authorized activity. We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Report vulnerabilities promptly and provide sufficient detail for reproduction
- Do not publicly disclose the vulnerability before a fix is available
- Do not exploit the vulnerability beyond what is necessary to demonstrate the issue

## Credit

We appreciate the work of security researchers. With your permission, we will publicly credit you in the release notes when a reported vulnerability is fixed.

## Security Practices

This project employs the following security measures at system boundaries:

- **Input validation** for all skill inputs and configuration files
- **Sensitive data detection** via pre-commit hooks to prevent accidental commit of API keys or credentials
- **Write detection for protected directories** (e.g., `framework/`) — alerts when read-only template files are modified
- **YAML schema validation** to ensure workflow state integrity

For questions about this policy, contact <wangzixuan0828@gmail.com>.
