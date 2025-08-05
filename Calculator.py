# simple calculator.
print("enter operations")
print("+ for adfition")
print("- for subtraction")
print("* for multiplication")
print("/ for division")

#take input from user.
choice=input("enter yoir choice(+, -, *, /):")
num1=float(input("enter first number"))
num2=float(input("enter second number"))

if  choice =="+":
	print(num1+num2)
elif choice == "-":
	print(num1-num2)
elif choice =="*":
	print(num1*num2)
elif  choice =="/":
	if num1 != 0:
		print(num1/num2)
	else:
		print("error division by 0 is bot allowed")
else:
			print("unknown operations")
	
