# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

| Version | Supported          | End of Life        |
| ------- | ------------------ | ------------------ |
| 5.1.x   | :white_check_mark: | 2027-04-10         |
| 5.0.x   | :x:                | 2025-10-10         |
| 4.0.x   | :white_check_mark: | 2026-10-10         |
| < 4.0   | :x:                | 2024-06-10         |

## Reporting a Vulnerability

We appreciate your efforts to responsibly disclose security vulnerabilities. We request that you do not publicly disclose the vulnerability until we have had a chance to address it.

### How to Report

Please report security vulnerabilities by emailing **security@agis-project.dev** with the following information:

1. **Title**: Brief description of the vulnerability
2. **Description**: Detailed explanation of the security issue
3. **Steps to Reproduce**: Instructions on how to reproduce the vulnerability
4. **Impact**: Assessment of the potential impact (critical, high, medium, low)
5. **Proof of Concept**: Code or steps demonstrating the vulnerability (if applicable)
6. **Affected Versions**: Which versions of AGIS are affected
7. **Suggested Fix**: Any recommendations for fixing the issue (optional)

### Response Timeline

- **Initial Response**: We aim to acknowledge receipt of your report within 48 hours
- **Assessment**: We will investigate and assess the vulnerability within 5-7 business days
- **Fix Development**: Once confirmed, we prioritize creating a patch based on severity
- **Release**: Security patches are released as soon as they are tested and ready
- **Disclosure**: We will coordinate with you on the disclosure timeline

### Security Update Process

1. A security fix is developed and tested
2. Security advisories are published on the GitHub Security Advisories page
3. An official release is made with the security patch
4. Users are notified through GitHub notifications and our security mailing list

### Scope

We consider the following areas in scope for security reports:
- Authentication and authorization vulnerabilities
- Data exposure or leakage
- Injection attacks (SQL, Command, etc.)
- Cryptographic weaknesses
- Access control issues
- Server-side vulnerabilities

### Out of Scope

The following are out of scope:
- Social engineering
- Physical attacks on infrastructure
- Denial of service attacks
- Vulnerabilities in third-party libraries (report to the library maintainers)
- Missing security headers or best practices without demonstrable impact

## Security Best Practices

When using AGIS, we recommend:

- Keep your dependencies up to date
- Enable two-factor authentication on your GitHub account
- Use environment variables for sensitive credentials
- Review the changelog regularly for security updates
- Report any suspicious activity immediately

## PGP Key

For sensitive communications, you may encrypt using our PGP key (available upon request).

---

**Last Updated**: 2026-04-10