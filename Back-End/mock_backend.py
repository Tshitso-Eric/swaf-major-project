from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path: str):
    return {
        "message": "Hello from the Protected Backend!",
        "path": path,
        "method": request.method,
        "status": "Success"
    }

if __name__ == "__main__":
    print("🚀 Mock Backend running on http://localhost:8080")
    uvicorn.run(app, host="0.0.0.0", port=8080)
