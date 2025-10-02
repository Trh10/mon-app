import { NextRequest, NextResponse } from "next/server";  
import { getSession } from "@/lib/session";  
import { removeAccount, listAccounts, setActiveAccount } from "@/lib/emailAccountsDb"; 
