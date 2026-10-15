import { Component } from "react";

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#0f172a",
            color: "#e2e8f0",
          }}
        >
          <h1 style={{ fontSize: 20, marginTop: 0 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8" }}>
            The employee sign-in screen crashed. Details below (useful for support).
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 16,
              background: "#020617",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
              color: "#fca5a5",
            }}
          >
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
